import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  products: defineTable({
    userId: v.id("users"),
    slug: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("published"),
      v.literal("draft"),
      v.literal("processing")
    ),
    agent: v.string(),
    date: v.string(),
  }).index("by_user", ["userId"]),
  licenses: defineTable({
    userId: v.id("users"),
    licenseKey: v.string(),
    email: v.string(),
    customerName: v.optional(v.string()),
    activatedAt: v.number(),
  }).index("by_user", ["userId"]),
  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),
  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  })
    .index("by_chat", ["chatId", "createdAt"])
    .index("by_user", ["userId"]),
  usage: defineTable({
    userId: v.id("users"),
    source: v.string(),
    model: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    cost: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),
  pipelineRuns: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    imagesSaved: v.optional(v.number()),
    imagesFailed: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_user", ["userId", "createdAt"]),
  pipelineTasks: defineTable({
    runId: v.id("pipelineRuns"),
    userId: v.id("users"),
    agentId: v.string(),
    agentName: v.string(),
    step: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    input: v.string(),
    output: v.optional(v.string()),
    model: v.string(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    cost: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_run", ["runId", "step"])
    .index("by_user", ["userId"]),
  gallery: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),
});
