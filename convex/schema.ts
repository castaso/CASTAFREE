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
    sourceRunId: v.optional(v.id("pipelineRuns")),
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
    productId: v.optional(v.id("products")),
    agentIds: v.optional(v.array(v.string())),
    imagesSaved: v.optional(v.number()),
    imagesFailed: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_product", ["productId"]),
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
  artifacts: defineTable({
    userId: v.id("users"),
    runId: v.optional(v.id("pipelineRuns")),
    productId: v.optional(v.id("products")),
    agentId: v.string(),
    kind: v.union(
      v.literal("bvi"),
      v.literal("image_ad_brief"),
      v.literal("ebook_pdf"),
      v.literal("landing_page"),
      v.literal("kie_veo_sheet"),
      v.literal("scalev_pack")
    ),
    name: v.string(),
    mimeType: v.string(),
    storageId: v.id("_storage"),
    size: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_run", ["runId"])
    .index("by_product", ["productId"]),
  gallery: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),
  concepts: defineTable({
    userId: v.id("users"),
    topic: v.string(),
    index: v.number(),
    title: v.string(),
    angle: v.string(),
    targetAudience: v.string(),
    format: v.string(),
    price: v.string(),
    rawText: v.string(),
    status: v.union(
      v.literal("proposed"),
      v.literal("approved"),
      v.literal("rejected")
    ),
    productId: v.optional(v.id("products")),
    runId: v.optional(v.id("pipelineRuns")),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_run", ["runId"]),
  userSettings: defineTable({
    userId: v.id("users"),
    model: v.string(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
});
