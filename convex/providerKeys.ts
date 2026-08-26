import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { maskKey } from "./lib/llm";
import {
  KIE_BASE,
  SCRAPE_CREATORS_BASE,
} from "./lib/providers";

export const PROVIDERS = [
  "gemini",
  "groq",
  "openai",
  "anthropic",
  "kie",
  "pexels",
  "scrape_creators",
  "supabase",
] as const;

export type Provider = (typeof PROVIDERS)[number];

const providerValidator = v.union(
  v.literal("gemini"),
  v.literal("groq"),
  v.literal("openai"),
  v.literal("anthropic"),
  v.literal("kie"),
  v.literal("pexels"),
  v.literal("scrape_creators"),
  v.literal("supabase")
);

// ── Client-facing mutations/queries ─────────────────────────────────────────

export const saveKey = mutation({
  args: {
    provider: providerValidator,
    key: v.string(),
    projectUrl: v.optional(v.string()),
  },
  handler: async (ctx, { provider, key, projectUrl }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    const trimmed = key.trim();
    if (!trimmed) throw new ConvexError("API key gak boleh kosong.");

    const existing = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first();

    const meta =
      provider === "supabase" && projectUrl
        ? { projectUrl: projectUrl.replace(/\/+$/, "") }
        : existing?.meta;

    if (existing) {
      await ctx.db.patch(existing._id, {
        key: trimmed,
        meta,
        status: "unverified",
        lastError: undefined,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return await ctx.db.insert("providerKeys", {
      userId,
      provider,
      key: trimmed,
      meta,
      status: "unverified",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteKey = mutation({
  args: { provider: providerValidator },
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    const existing = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first();
    if (existing !== null && existing.userId === userId) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Masked view for the Settings UI — never returns full keys. */
export const listStatuses = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((row) => ({
      provider: row.provider,
      maskedKey: maskKey(row.key),
      projectUrl: row.meta?.projectUrl,
      status: row.status,
      lastError: row.lastError,
      lastCheckedAt: row.lastCheckedAt,
    }));
  },
});

// ── Internal access for actions ─────────────────────────────────────────────

export const getPlainKey = internalQuery({
  args: { userId: v.id("users"), provider: providerValidator },
  handler: async (
    ctx,
    { userId, provider }
  ): Promise<Doc<"providerKeys"> | null> => {
    return await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) =>
        q.eq("userId", userId).eq("provider", provider)
      )
      .first();
  },
});

export const getAllPlain = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }): Promise<Doc<"providerKeys">[]> => {
    return await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();
  },
});

async function patchStatus(
  ctx: any,
  row: Doc<"providerKeys"> | null,
  ok: boolean,
  error?: string
) {
  if (!row) return;
  await ctx.runMutation(internal.providerData.patchStatus, {
    id: row._id as Id<"providerKeys">,
    status: ok ? "ok" : "error",
    lastError: ok ? undefined : (error ?? "Gagal terhubung."),
    lastCheckedAt: Date.now(),
  });
}

// ── Test connection ─────────────────────────────────────────────────────────

export const testConnection = action({
  args: { provider: providerValidator },
  handler: async (ctx, { provider }) => {
    const rawUserId = await getAuthUserId(ctx);
    if (rawUserId === null) throw new ConvexError("Not authenticated");

    const row = await ctx.runQuery(internal.providerKeys.getPlainKey, {
      userId: rawUserId,
      provider,
    });
    if (!row) {
      return { ok: false as const, error: "API key belum diisi." };
    }

    let ok = false;
    let error: string | undefined;
    try {
      switch (provider) {
        case "gemini":
          await pingGemini(row.key);
          ok = true;
          break;
        case "groq":
          await pingBearer(`${row.key}`, "https://api.groq.com/openai/v1/models");
          ok = true;
          break;
        case "openai":
          await pingBearer(row.key, "https://api.openai.com/v1/models");
          ok = true;
          break;
        case "anthropic":
          await pingAnthropic(row.key);
          ok = true;
          break;
        case "kie":
          await pingKie(row.key);
          ok = true;
          break;
        case "pexels":
          await pingPexels(row.key);
          ok = true;
          break;
        case "scrape_creators":
          await pingScrapeCreators(row.key);
          ok = true;
          break;
        case "supabase": {
          const url = row.meta?.projectUrl;
          if (!url) throw new Error("Project URL Supabase belum diisi.");
          await pingSupabase(url, row.key);
          ok = true;
          break;
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    await patchStatus(ctx, row, ok, error);
    return ok
      ? ({ ok: true as const } )
      : ({ ok: false as const, error: error ?? "Gagal terhubung." });
  },
});

// ── Provider pings ──────────────────────────────────────────────────────────

async function assertOk(res: Response, label: string) {
  if (!res.ok) {
    throw new Error(`${label}: HTTP ${res.status}`);
  }
}

async function pingGemini(key: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`
  );
  await assertOk(res, "Gemini");
}

async function pingBearer(key: string, url: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });
  await assertOk(res, "Provider");
}

async function pingAnthropic(key: string) {
  const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
  });
  await assertOk(res, "Anthropic");
}

async function pingKie(key: string) {
  const res = await fetch(`${KIE_BASE}/api/v1/chat/token/balance`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  // Balance endpoint may vary; accept any authenticated response.
  if (res.status === 401 || res.status === 403) {
    throw new Error(`KIE: HTTP ${res.status} (key ditolak)`);
  }
}

async function pingPexels(key: string) {
  const res = await fetch(
    "https://api.pexels.com/v1/search?query=test&per_page=1",
    { headers: { Authorization: key } }
  );
  await assertOk(res, "Pexels");
}

async function pingScrapeCreators(key: string) {
  const res = await fetch(SCRAPE_CREATORS_BASE, {
    headers: { "x-api-key": key },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Scrape Creators: HTTP ${res.status} (key ditolak)`);
  }
}

async function pingSupabase(projectUrl: string, serviceKey: string) {
  const res = await fetch(`${projectUrl}/storage/v1/bucket`, {
    headers: { Authorization: `Bearer ${serviceKey}` },
  });
  await assertOk(res, "Supabase");
}
