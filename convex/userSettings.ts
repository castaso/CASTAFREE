import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

export const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4o",
] as const;

export const DEFAULT_MODEL = "gpt-4o-mini";

export type TextEngine = "gemini" | "groq" | "openai" | "anthropic";

export function isAllowedModel(model: string): boolean {
  return (ALLOWED_MODELS as readonly string[]).includes(model);
}

const engineValidator = v.union(
  v.literal("gemini"),
  v.literal("groq"),
  v.literal("openai"),
  v.literal("anthropic")
);

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      model: settings?.model ?? DEFAULT_MODEL,
      textEngine: settings?.textEngine ?? ("gemini" as TextEngine),
      imageEngine: settings?.imageEngine ?? null,
    };
  },
});

/** Runtime resolution used by AI actions (works from actions via runQuery). */
export const resolveRunConfig = query({
  args: {},
  handler: async (
    ctx
  ): Promise<{ textEngine: TextEngine; model: string; imageEngine: string | null }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return {
        textEngine: "gemini",
        model: DEFAULT_MODEL,
        imageEngine: null,
      };
    }
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      textEngine: settings?.textEngine ?? "gemini",
      // Model override only applies when the chosen engine is OpenAI.
      model:
        (settings?.textEngine ?? "gemini") === "openai"
          ? (settings?.model ?? DEFAULT_MODEL)
          : "",
      imageEngine: settings?.imageEngine ?? null,
    };
  },
});

// Legacy single-model resolver kept for backward compatibility.
export const resolveModel = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return DEFAULT_MODEL;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return settings?.model ?? DEFAULT_MODEL;
  },
});

export const setModel = mutation({
  args: { model: v.string() },
  handler: async (ctx, { model }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    if (!isAllowedModel(model)) {
      throw new ConvexError(`Model tidak didukung: ${model}`);
    }
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { model, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", {
      userId,
      model,
      updatedAt: Date.now(),
    });
  },
});

export const setTextEngine = mutation({
  args: { engine: engineValidator },
  handler: async (ctx, { engine }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        textEngine: engine,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", {
      userId,
      model: DEFAULT_MODEL,
      textEngine: engine,
      updatedAt: Date.now(),
    });
  },
});

export const setImageEngine = mutation({
  args: { engine: v.union(v.literal("kie")) },
  handler: async (ctx, { engine }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        imageEngine: engine === "kie" ? "kie" : undefined,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("userSettings", {
      userId,
      model: DEFAULT_MODEL,
      imageEngine: engine === "kie" ? ("kie" as const) : undefined,
      updatedAt: Date.now(),
    });
  },
});
