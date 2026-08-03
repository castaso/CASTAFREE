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
});
