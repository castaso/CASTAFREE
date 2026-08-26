import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("gallery")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: {
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.db.insert("gallery", {
      userId,
      storageId: args.storageId,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      createdAt: Date.now(),
    });
  },
});

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, { productId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const product = await ctx.db.get(productId);
    if (product === null || product.userId !== userId) return [];
    return await ctx.db
      .query("gallery")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .order("desc")
      .collect();
  },
});

// Internal insert used by actions (e.g. the AI pipeline) that already hold
// a storageId from ctx.storage.store() and an authenticated userId.
export const saveInternal = internalMutation({
  args: {
    userId: v.id("users"),
    storageId: v.id("_storage"),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    productId: v.optional(v.id("products")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("gallery", {
      userId: args.userId,
      storageId: args.storageId,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      productId: args.productId,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("gallery") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const item = await ctx.db.get(id);
    if (item === null || item.userId !== userId) {
      throw new Error("Gallery item not found");
    }
    await ctx.storage.delete(item.storageId);
    await ctx.db.delete(id);
  },
});
