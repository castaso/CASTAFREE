import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";

export const SAMPLE_PRODUCTS = [
  {
    slug: "ebook-marketing-digital",
    name: "Ebook Marketing Digital 2024",
    status: "published" as const,
    agent: "Maya",
    date: "2024-01-15",
  },
  {
    slug: "kursus-online-seo",
    name: "Kursus Online SEO Mastery",
    status: "draft" as const,
    agent: "Dimas",
    date: "2024-02-20",
  },
  {
    slug: "template-landing-page",
    name: "Template Landing Page Pro",
    status: "published" as const,
    agent: "Sari",
    date: "2024-03-10",
  },
  {
    slug: "video-tutorial-ads",
    name: "Video Tutorial FB Ads",
    status: "processing" as const,
    agent: "Bayu",
    date: "2024-03-25",
  },
  {
    slug: "copywriting-swipe-file",
    name: "Copywriting Swipe File Bundle",
    status: "published" as const,
    agent: "Reza",
    date: "2024-04-05",
  },
  {
    slug: "research-niche-report",
    name: "Research: Niche Market Report",
    status: "published" as const,
    agent: "Maya",
    date: "2024-04-18",
  },
];

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("published"),
      v.literal("draft"),
      v.literal("processing")
    ),
    agent: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const date = new Date().toISOString().slice(0, 10);
    return await ctx.db.insert("products", { userId, date, ...args });
  },
});

// Internal insert used by actions (e.g. the AI pipeline's Scalev step) that
// already resolved the owning userId.
export const createInternal = internalMutation({
  args: {
    userId: v.id("users"),
    slug: v.string(),
    name: v.string(),
    status: v.union(
      v.literal("published"),
      v.literal("draft"),
      v.literal("processing")
    ),
    agent: v.string(),
  },
  handler: async (ctx, args) => {
    const date = new Date().toISOString().slice(0, 10);
    return await ctx.db.insert("products", { ...args, date });
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const product = await ctx.db.get(id);
    if (product === null || product.userId !== userId) {
      throw new Error("Product not found");
    }
    await ctx.db.delete(id);
  },
});

export const seedSamples = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return { seeded: false };
    const existing = await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing !== null) return { seeded: false };
    for (const product of SAMPLE_PRODUCTS) {
      await ctx.db.insert("products", { userId, ...product });
    }
    return { seeded: true };
  },
});
