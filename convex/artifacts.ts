import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, query } from "./_generated/server";

export const listByRun = query({
  args: { runId: v.id("pipelineRuns") },
  handler: async (ctx, { runId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("artifacts")
      .withIndex("by_run", (q) => q.eq("runId", runId))
      .collect();
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
      .query("artifacts")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("artifacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const saveInternal = internalMutation({  args: {
    userId: v.id("users"),
    runId: v.optional(v.id("pipelineRuns")),
    agentId: v.string(),
    kind: v.union(
      v.literal("bvi"),
      v.literal("product_brief"),
      v.literal("ugc_scripts"),
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("artifacts", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Used by the optional Supabase mirror after a successful public upload.
export const setPublicUrl = internalMutation({
  args: {
    id: v.id("artifacts"),
    publicUrl: v.string(),
  },
  handler: async (ctx, { id, publicUrl }) => {
    await ctx.db.patch(id, { publicUrl });
  },
});
