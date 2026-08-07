"use node";

/**
 * Turso (libSQL) integration.
 *
 * Turso is an edge-hosted distributed SQLite database that complements the
 * Convex backend with plain relational SQL. Credentials are read from the
 * environment (set them in the Freebuff Keys/API keys tab):
 *
 *   TURSO_DATABASE_URL  — e.g. libsql://my-db.turso.io
 *   TURSO_AUTH_TOKEN    — the database access token
 *
 * This module exposes three actions:
 *   - `health`       — verifies the connection and provisions the
 *                      `castafree_events` audit table (idempotent).
 *   - `logEvent`     — appends an audit event row (auth-scoped).
 *   - `recentEvents` — reads the latest audit events (auth-scoped).
 *
 * Verify end-to-end from the CLI once keys are set:
 *   bunx convex run turso:health
 */
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
// Use the pure-JS web build: it talks to Turso over HTTP (Hrana), so it has
// no native .node binding and bundles cleanly inside the Convex runtime.
import { createClient, type Client } from "@libsql/client/web";
import { action } from "./_generated/server";

/** Lazy singleton so each Convex node keeps a single pooled connection. */
let cachedClient: Client | null = null;

function getTursoClient(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) {
    throw new Error(
      "Turso belum dikonfigurasi: tambahkan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN di tab API Keys."
    );
  }
  if (!cachedClient) {
    cachedClient = createClient({ url, authToken });
  }
  return cachedClient;
}

const TABLE = "castafree_events";

const CREATE_TABLE = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  detail TEXT,
  user_id TEXT,
  created_at INTEGER NOT NULL
)`;

/** Normalize a libSQL row (array or object shape) into a plain record. */
function toRecord(row: unknown): Record<string, unknown> {
  if (row === null || typeof row !== "object") return {};
  const obj = row as Record<string, unknown>;
  if (Array.isArray(row)) {
    return {
      source: row[0],
      detail: row[1] ?? null,
      user_id: row[2] ?? null,
      created_at: row[3] ?? 0,
    };
  }
  return obj;
}

/** Ping Turso and make sure the audit table exists. */
export const health = action({
  args: {},
  handler: async () => {
    const client = getTursoClient();
    const startedAt = Date.now();
    try {
      await client.execute(CREATE_TABLE);
      await client.execute("SELECT 1");
      return { ok: true, latencyMs: Date.now() - startedAt };
    } catch (err) {
      console.error("Turso health check failed:", err);
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
});

/** Append an audit event to Turso (requires a signed-in user). */
export const logEvent = action({
  args: {
    source: v.string(),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, { source, detail }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const client = getTursoClient();
    const id = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO ${TABLE} (id, source, detail, user_id, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, source, detail ?? null, userId, Date.now()],
    });
    return { ok: true, id };
  },
});

/** Read the latest audit events from Turso (requires a signed-in user). */
export const recentEvents = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const client = getTursoClient();
    const clamped = Math.min(Math.max(limit ?? 25, 1), 100);
    const res = await client.execute({
      sql: `SELECT source, detail, user_id, created_at
            FROM ${TABLE}
            ORDER BY created_at DESC
            LIMIT ?`,
      args: [clamped],
    });
    return (res.rows as unknown[]).map((row) => {
      const r = toRecord(row);
      return {
        source: String(r.source ?? ""),
        detail: (r.detail ?? null) as string | null,
        userId: (r.user_id ?? null) as string | null,
        createdAt: Number(r.created_at ?? 0),
      };
    });
  },
});
