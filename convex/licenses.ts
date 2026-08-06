import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, mutation, query } from "./_generated/server";

const LICENSE_API_URL = "https://app.levelingdigital.com/api/activate";

type ActivateResponse = {
  success?: boolean;
  customer_name?: string;
  reason?: string;
};

/**
 * Validates a license key + email against the live CAST/|FREE
 * license server. Returns the parsed result; on success the client
 * persists the activation via `recordActivation`.
 */
export const activate = action({
  args: { licenseKey: v.string(), email: v.string() },
  handler: async (ctx, { licenseKey, email }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");

    let data: ActivateResponse;
    try {
      const res = await fetch(LICENSE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          license_key: licenseKey.trim().toUpperCase(),
          email: email.trim(),
        }),
      });
      data = (await res.json()) as ActivateResponse;
    } catch {
      return {
        success: false,
        reason: "Gagal menghubungi license server. Cek koneksi lalu coba lagi.",
      };
    }

    const success = data.success === true;
    if (!success) {
      return { success: false, reason: data.reason ?? "Aktivasi gagal." };
    }
    return { success: true, customerName: data.customer_name };
  },
});

export const recordActivation = mutation({
  args: {
    licenseKey: v.string(),
    email: v.string(),
    customerName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    return await ctx.db.insert("licenses", {
      userId,
      licenseKey: args.licenseKey.trim().toUpperCase(),
      email: args.email.trim(),
      customerName: args.customerName,
      activatedAt: Date.now(),
    });
  },
});

export const myLicenses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("licenses")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});
