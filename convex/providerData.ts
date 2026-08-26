import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Internal data helpers for provider-key status bookkeeping.

export const patchStatus = internalMutation({
  args: {
    id: v.id("providerKeys"),
    status: v.union(
      v.literal("unverified"),
      v.literal("ok"),
      v.literal("error")
    ),
    lastError: v.optional(v.string()),
    lastCheckedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});
