import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

// ── Internal data helpers (used by the pipelineAI action) ──

export const createRun = internalMutation({
  args: { userId: v.id("users"), topic: v.string(), createdAt: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipelineRuns", {
      userId: args.userId,
      topic: args.topic,
      status: "running",
      createdAt: args.createdAt,
    });
  },
});

export const completeRun = internalMutation({
  args: {
    runId: v.id("pipelineRuns"),
    completedAt: v.number(),
    imagesSaved: v.optional(v.number()),
    imagesFailed: v.optional(v.number()),
  },
  handler: async (ctx, { runId, completedAt, imagesSaved, imagesFailed }) => {
    await ctx.db.patch(runId, {
      status: "completed",
      completedAt,
      imagesSaved,
      imagesFailed,
    });
  },
});

export const failRun = internalMutation({
  args: {
    runId: v.id("pipelineRuns"),
    error: v.string(),
    completedAt: v.number(),
  },
  handler: async (ctx, { runId, error, completedAt }) => {
    await ctx.db.patch(runId, { status: "failed", completedAt });
  },
});

export const createTask = internalMutation({
  args: {
    runId: v.id("pipelineRuns"),
    userId: v.id("users"),
    agentId: v.string(),
    agentName: v.string(),
    step: v.number(),
    input: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pipelineTasks", {
      ...args,
      model: "gpt-4o-mini",
    });
  },
});

export const completeTask = internalMutation({
  args: {
    taskId: v.id("pipelineTasks"),
    output: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    cost: v.number(),
    completedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.taskId, {
      status: "completed",
      output: args.output,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      cost: args.cost,
      completedAt: args.completedAt,
    });
  },
});

export const failTask = internalMutation({
  args: {
    taskId: v.id("pipelineTasks"),
    error: v.string(),
    completedAt: v.number(),
  },
  handler: async (ctx, { taskId, error, completedAt }) => {
    await ctx.db.patch(taskId, {
      status: "failed",
      error,
      completedAt,
    });
  },
});

// ── Public queries for the client ──

export const listRuns = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("pipelineRuns")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getTasksByRun = query({
  args: { runId: v.id("pipelineRuns") },
  handler: async (ctx, { runId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const run = await ctx.db.get(runId);
    if (run === null || run.userId !== userId) return [];
    return await ctx.db
      .query("pipelineTasks")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .order("asc")
      .collect();
  },
});

export const getRun = query({
  args: { runId: v.id("pipelineRuns") },
  handler: async (ctx, { runId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const run = await ctx.db.get(runId);
    if (run === null || run.userId !== userId) return null;
    return run;
  },
});
