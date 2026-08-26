import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, query } from "./_generated/server";

export const insertConcept = internalMutation({
  args: {
    userId: v.id("users"),
    topic: v.string(),
    index: v.number(),
    title: v.string(),
    angle: v.string(),
    targetAudience: v.string(),
    format: v.string(),
    price: v.string(),
    rawText: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("concepts", {
      ...args,
      status: "proposed" as const,
    });
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("concepts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);
  },
});
