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
    usp: v.optional(v.string()),
    avatar: v.optional(v.string()),
    rawText: v.string(),
    targetMarket: v.optional(v.string()),
    priceTier: v.optional(v.string()),
    founderAngle: v.optional(v.string()),
    productType: v.optional(v.union(v.literal("digital"), v.literal("fisik"))),
    depth: v.optional(v.string()),
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

export const getConcept = query({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, { conceptId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const concept = await ctx.db.get(conceptId);
    if (concept === null || concept.userId !== userId) return null;
    return concept;
  },
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

// Used by the approveAndGenerate action: create the product row and link it.
export const createProductForConcept = internalMutation({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, { conceptId }) => {
    const concept = await ctx.db.get(conceptId);
    if (concept === null) throw new Error("Konsep tidak ditemukan.");
    if (concept.status === "approved" && concept.productId) {
      return concept.productId;
    }
    const productId = await ctx.db.insert("products", {
      userId: concept.userId,
      slug: slugify(concept.title),
      name: concept.title,
      status: "published",
      agent: "Maya",
      date: new Date().toISOString().slice(0, 10),
      sourceRunId: concept.runId,
    });
    await ctx.db.patch(conceptId, {
      status: "approved",
      productId,
    });
    return productId;
  },
});
