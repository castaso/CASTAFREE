import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import {
  ENGINE_DEFAULT_MODELS,
  ENGINE_MODEL_OPTIONS,
  TEXT_ENGINES,
} from "./lib/llm";

export const ALLOWED_MODELS = [
  "gpt-4o-mini",
  "gpt-4.1-mini",
  "gpt-4o",
] as const;

export const DEFAULT_MODEL = "gpt-4o-mini";

export type TextEngine = (typeof TEXT_ENGINES)[number];

function isAllowedModel(model: string): boolean {
  return TEXT_ENGINES.some((engine) =>
    ENGINE_MODEL_OPTIONS[engine].some((option) => option.id === model)
  );
}

const engineValidator = v.union(
  v.literal("gemini"),
  v.literal("groq"),
  v.literal("kimi"),
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
      // Model override honored when it belongs to the active engine.
      model:
        settings?.model &&
        ENGINE_MODEL_OPTIONS[settings?.textEngine ?? "gemini"].some(
          (o) => o.id === settings.model
        )
          ? settings.model
          : "",
      imageEngine: settings?.imageEngine ?? null,
    };
  },
});

/**
 * Effective engine+model for one agent: per-agent override wins, otherwise
 * the global default (model honored when it belongs to the active engine).
 * Called by actions once per agent step.
 */
export const resolveForAgent = query({
  args: { agentId: v.string() },
  handler: async (
    ctx,
    { agentId }
  ): Promise<{ textEngine: TextEngine; model: string }> => {
    const userId = await getAuthUserId(ctx);
    let globalEngine: TextEngine = "gemini";
    let globalModel = "";
    if (userId) {
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      globalEngine = settings?.textEngine ?? "gemini";
      if (
        settings?.model &&
        ENGINE_MODEL_OPTIONS[globalEngine].some((o) => o.id === settings.model)
      ) {
        globalModel = settings.model;
      }
      const override = await ctx.db
        .query("agentOverrides")
        .withIndex("by_user_agent", (q) =>
          q.eq("userId", userId).eq("agentId", agentId)
        )
        .first();
      if (override) {
        return {
          textEngine: override.engine,
          model:
            override.model ?? ENGINE_DEFAULT_MODELS[override.engine],
        };
      }
    }
    return {
      textEngine: globalEngine,
      model: globalModel || ENGINE_DEFAULT_MODELS[globalEngine],
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

// ── Per-agent overrides (doc 13 step 3) ─────────────────────────────────────

export const listAgentOverrides = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("agentOverrides")
      .withIndex("by_user_agent", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const setAgentOverride = mutation({
  args: {
    agentId: v.string(),
    engine: v.union(engineValidator, v.null()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, { agentId, engine, model }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");

    const existing = await ctx.db
      .query("agentOverrides")
      .withIndex("by_user_agent", (q) =>
        q.eq("userId", userId).eq("agentId", agentId)
      )
      .first();

    // engine === null clears the override ("Ikuti default").
    if (engine === null) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    const trimmedModel =
      model && ENGINE_MODEL_OPTIONS[engine].some((o) => o.id === model)
        ? model
        : undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        engine,
        model: trimmedModel,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("agentOverrides", {
      userId,
      agentId,
      engine,
      model: trimmedModel,
      updatedAt: Date.now(),
    });
  },
});
