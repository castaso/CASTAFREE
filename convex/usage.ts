import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  query,
} from "./_generated/server";

export const listUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});

export const usageSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    const empty = {
      totalCost: 0,
      totalTokens: 0,
      totalCalls: 0,
      monthCost: 0,
      monthTokens: 0,
      monthCalls: 0,
    };
    if (userId === null) return empty;

    const rows = await ctx.db
      .query("usage")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).getTime();

    let totalCost = 0;
    let totalTokens = 0;
    let monthCost = 0;
    let monthTokens = 0;
    let monthCalls = 0;

    for (const row of rows) {
      totalCost += row.cost;
      totalTokens += row.totalTokens;
      if (row.createdAt >= monthStart) {
        monthCost += row.cost;
        monthTokens += row.totalTokens;
        monthCalls += 1;
      }
    }

    return {
      totalCost,
      totalTokens,
      totalCalls: rows.length,
      monthCost,
      monthTokens,
      monthCalls,
    };
  },
});

export const insertUsage = internalMutation({
  args: {
    userId: v.id("users"),
    source: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    cost: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("usage", args);
  },
});
