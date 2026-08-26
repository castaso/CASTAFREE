import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, mutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  callText,
  estimateModelCost,
  type EngineCredential,
  type TextEngine,
} from "./lib/llm";
import { fetchCompetitorContext } from "./lib/scrapeCreators";

const CONCEPT_MARKER = /^\s*={2,}\s*KONSEP\s*(\d+)\s*[:\-–—]?\s*(.+?)\s*={2,}\s*$/i;

export type ParsedConcept = {
  index: number;
  title: string;
  angle: string;
  targetAudience: string;
  format: string;
  price: string;
  rawText: string;
};

const RESEARCH_PROMPT = `Kamu adalah **Maya**, Research Analyst di CAST/|FREE.
Tugas kamu: riset & validasi pasar untuk satu topik, lalu mengusulkan TEPAT 5 konsep produk digital.

Setelah 1-2 paragraf ringkasan riset pasar (tren, kompetitor, target audiens), keluarkan TEPAT 5 konsep dengan format PERSIS seperti ini (satu marker per konsep, di baris sendiri):

===KONSEP 1: [Judul Produk]===
Angle: [unique value proposition dalam satu kalimat]
Target: [target audiens]
Format: [ebook / kursus / template / bundle, dst]
Harga: [estimasi harga jual dalam Rupiah]
Alasan: [kenapa konsep ini layak jual, singkat]

(ulangi sampai ===KONSEP 5: ...===)

Jawab dalam Bahasa Indonesia. Jangan ngasal — kalau gak punya data spesifik, akui dan kasih estimasi terbaik.`;

/** Parse Maya's output into structured concepts (unit-tested). */
export function parseConcepts(output: string): ParsedConcept[] {
  const concepts: ParsedConcept[] = [];
  let current: ParsedConcept | null = null;
  for (const line of output.split(/\r?\n/)) {
    const match = CONCEPT_MARKER.exec(line);
    if (match) {
      if (current) concepts.push(current);
      current = {
        index: parseInt(match[1], 10),
        title: match[2].trim(),
        angle: "",
        targetAudience: "",
        format: "",
        price: "",
        rawText: "",
      };
    } else if (current) {
      current.rawText += `${line}\n`;
      const field = /^\s*(angle|target|format|harga|alasan)\s*:\s*(.+)$/i.exec(
        line
      );
      if (!field) continue;
      const value = field[2].trim();
      switch (field[1].toLowerCase()) {
        case "angle":
          current.angle = value;
          break;
        case "target":
          current.targetAudience = value;
          break;
        case "format":
          current.format = value;
          break;
        case "harga":
          current.price = value;
          break;
        default:
          break;
      }
    }
  }
  if (current) concepts.push(current);
  return concepts
    .map((c) => ({ ...c, rawText: c.rawText.trim() }))
    .filter((c) => c.title.length > 0);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export const runResearch = action({
  args: { topic: v.string() },
  handler: async (ctx, { topic }) => {
    const rawUserId = await getAuthUserId(ctx);
    if (rawUserId === null) throw new ConvexError("Not authenticated");
    const userId: Id<"users"> = rawUserId;

    const runConfig = await ctx.runQuery(api.userSettings.resolveRunConfig);
    const keyRows = await ctx.runQuery(internal.providerKeys.getAllPlain, {
      userId,
    });
    const credentials: EngineCredential[] = keyRows
      .filter((row) =>
        ["gemini", "groq", "openai", "anthropic"].includes(row.provider)
      )
      .map((row) => ({
        engine: row.provider as TextEngine,
        apiKey: row.key,
      }));
    const scrapeKey =
      keyRows.find((row) => row.provider === "scrape_creators")?.key ?? null;

    let userInput = `Topik produk: ${topic}`;
    const competitorBlock = await fetchCompetitorContext(scrapeKey, topic);
    if (competitorBlock) {
      userInput = `${competitorBlock}\n${userInput}`;
    }

    const call = await callText({
      chosenEngine: runConfig.textEngine,
      modelOverride: runConfig.model || undefined,
      credentials,
      hasEnvOpenAI: Boolean(process.env.OPENAI_API_KEY),
      system: RESEARCH_PROMPT,
      user: userInput,
      temperature: 0.7,
    });
    if (!call.ok) {
      return { ok: false as const, error: call.error ?? "Semua engine teks gagal." };
    }
    const output = call.text;
    const promptTokens = call.promptTokens;
    const completionTokens = call.completionTokens;

    const parsed = parseConcepts(output);
    if (parsed.length === 0) {
      return {
        ok: false as const,
        error: "Maya gak ngasih konsep yang bisa dibaca. Coba topik lain.",
      };
    }

    const now = Date.now();
    const ids: Id<"concepts">[] = [];
    for (const concept of parsed.slice(0, 5)) {
      ids.push(
        await ctx.runMutation(internal.researchData.insertConcept, {
          userId,
          topic,
          index: concept.index,
          title: concept.title,
          angle: concept.angle,
          targetAudience: concept.targetAudience,
          format: concept.format,
          price: concept.price,
          rawText: concept.rawText,
          createdAt: now,
        })
      );
    }

    await ctx.runMutation(internal.usage.insertUsage, {
      userId,
      source: "Riset: Maya",
      model: call.model ?? "unknown",
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost: estimateModelCost(call.model ?? "", promptTokens, completionTokens),
      createdAt: now,
    });

    return { ok: true as const, conceptIds: ids };
  },
});

// ── concept lifecycle ───────────────────────────────────────────────────────

export const approveConcept = mutation({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, { conceptId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    const concept = await ctx.db.get(conceptId);
    if (concept === null || concept.userId !== userId) {
      throw new ConvexError("Konsep tidak ditemukan.");
    }
    if (concept.status === "approved" && concept.productId) {
      return concept.productId;
    }

    const productId = await ctx.db.insert("products", {
      userId,
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

export const rejectConcept = mutation({
  args: { conceptId: v.id("concepts") },
  handler: async (ctx, { conceptId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new ConvexError("Not authenticated");
    const concept = await ctx.db.get(conceptId);
    if (concept === null || concept.userId !== userId) {
      throw new ConvexError("Konsep tidak ditemukan.");
    }
    await ctx.db.patch(conceptId, { status: "rejected" });
  },
});
