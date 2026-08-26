import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

export const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4o",
] as const;

export const DEFAULT_MODEL = "gpt-4o-mini";

export function isAllowedModel(model: string): boolean {
  return (ALLOWED_MODELS as readonly string[]).includes(model);
}

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
    };
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

// Internal helper used by AI actions to resolve the caller's model choice.
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
