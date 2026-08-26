import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action, mutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  callText,
  estimateModelCost,
  type EngineCredential,
  type TextEngine,
} from "./lib/llm";
import { fetchCompetitorContext } from "./lib/scrapeCreators";

/** Marker accepts both numeric (KONSEP 1) and lettered (KONSEP A) labels. */
const CONCEPT_MARKER = /^\s*={2,}\s*KONSEP\s*([A-E1-5])\s*[:\-–—]?\s*(.+?)\s*={2,}\s*$/i;

function markerToIndex(raw: string): number {
  const num = Number(raw);
  if (!Number.isNaN(num)) return num;
  return raw.toUpperCase().charCodeAt(0) - 64;
}

export type ParsedConcept = {
  index: number;
  title: string;
  angle: string;
  targetAudience: string;
  format: string;
  price: string;
  usp: string;
  avatar: string;
  rawText: string;
};

const RESEARCH_PROMPT = `Kamu adalah **Maya**, Research Analyst di CAST/|FREE.
Tugas kamu: riset & validasi pasar untuk satu topik, lalu mengusulkan TEPAT 5 konsep produk.

Setelah 1-2 paragraf ringkasan riset pasar (tren, kompetitor, target audiens), keluarkan TEPAT 5 konsep dengan format PERSIS seperti ini (satu marker per konsep, di baris sendiri):

===KONSEP A: [Judul Produk]===
One-liner: [deskripsi satu kalimat]
Angle: [unique value proposition dalam satu kalimat]
Target: [target audiens]
Avatar: [customer avatar — siapa dia, kondisi, pain utama dalam satu kalimat]
USP: [unique selling point pembeda dari kompetitor, satu kalimat tajam]
Format: [ebook / kursus / template / bundle / produk fisik, dst]
Harga: [estimasi harga jual dalam Rupiah]
Alasan: [kenapa konsep ini layak jual, singkat]

(ulangi sampai ===KONSEP E: ...===)

Ikuti konteks riset yang user kasih (target market, price tier, founder angle, depth, tipe produk) di setiap konsep.
Jawab dalam Bahasa Indonesia. Jangan ngasal — kalau gak punya data spesifik, akui dan kasih estimasi terbaik.`;

/** Pure helper: 1->A ... 5->E (unit-tested). */
export function conceptLetter(index: number): string {
  return String.fromCharCode(64 + Math.max(1, Math.min(26, index)));
}

/**
 * Pure helper: split Maya's brief+BVI output into the two markdown docs
 * delimited by ===PRODUCT_BRIEF=== and ===BVI=== (unit-tested).
 */
export function splitBriefAndBvi(
  output: string
): { brief: string; bvi: string } {
  const briefMatch =
    /=+\s*PRODUCT_BRIEF\s*=+\s*\n?([\s\S]*?)(?==+\s*BVI\s*=+|$)/i.exec(output);
  const bviMatch = /=+\s*BVI\s*=+\s*\n?([\s\S]*)$/i.exec(output);
  return {
    brief: briefMatch?.[1]?.trim() ?? "",
    bvi: bviMatch?.[1]?.trim() ?? "",
  };
}

/** Parse Maya's output into structured concepts (unit-tested). */
export function parseConcepts(output: string): ParsedConcept[] {
  const concepts: ParsedConcept[] = [];
  let current: ParsedConcept | null = null;
  for (const line of output.split(/\r?\n/)) {
    const match = CONCEPT_MARKER.exec(line);
    if (match) {
      if (current) concepts.push(current);
      current = {
        index: markerToIndex(match[1]),
        title: match[2].trim(),
        angle: "",
        targetAudience: "",
        format: "",
        price: "",
        usp: "",
        avatar: "",
        rawText: "",
      };
    } else if (current) {
      current.rawText += `${line}\n`;
      const field = /^\s*(one-liner|angle|target|avatar|usp|format|harga|alasan)\s*:\s*(.+)$/i.exec(
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
        case "usp":
          current.usp = value;
          break;
        case "avatar":
          current.avatar = value;
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
  args: {
    topic: v.string(),
    targetMarket: v.optional(v.string()),
    priceTier: v.optional(v.string()),
    founderAngle: v.optional(v.string()),
    productType: v.optional(v.union(v.literal("digital"), v.literal("fisik"))),
    depth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    // Compose the research context from the full form.
    const formLines = [
      `Niche idea: ${args.topic}`,
      args.targetMarket ? `Target market: ${args.targetMarket}` : null,
      args.priceTier ? `Price tier: ${args.priceTier}` : null,
      args.founderAngle ? `Founder angle: ${args.founderAngle}` : null,
      args.productType ? `Tipe produk: ${args.productType}` : null,
      args.depth ? `Depth analisis: ${args.depth}` : null,
    ].filter(Boolean) as string[];
    let userInput = formLines.join("\n");

    const competitorBlock = await fetchCompetitorContext(scrapeKey, args.topic);
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
    for (const [i, concept] of parsed.slice(0, 5).entries()) {
      ids.push(
        await ctx.runMutation(internal.researchData.insertConcept, {
          userId,
          topic: args.topic,
          index: i + 1,
          title: concept.title,
          angle: concept.angle || concept.usp,
          targetAudience: concept.targetAudience,
          format: concept.format,
          price: concept.price,
          usp: concept.usp || undefined,
          avatar: concept.avatar || undefined,
          rawText: concept.rawText,
          targetMarket: args.targetMarket,
          priceTier: args.priceTier,
          founderAngle: args.founderAngle,
          productType: args.productType,
          depth: args.depth,
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

/**
 * Doc-07 approval flow: approve the concept into a product AND generate
 * PRODUCT_BRIEF.md + BVI.md artifacts bound to it. Soft-fails gracefully:
 * the product always exists; artifacts are best-effort.
 */
export const approveAndGenerate = action({
  args: { conceptId: v.id("concepts") },
  handler: async (
    ctx,
    { conceptId }
  ): Promise<{ ok: true; productId: Id<"products">; briefGenerated: boolean }> => {
    const rawUserId = await getAuthUserId(ctx);
    if (rawUserId === null) throw new ConvexError("Not authenticated");
    const userId: Id<"users"> = rawUserId;

    const concept: Doc<"concepts"> | null = await ctx.runQuery(
      api.researchData.getConcept,
      { conceptId }
    );
    if (concept === null || concept.userId !== userId) {
      throw new ConvexError("Konsep tidak ditemukan.");
    }

    // 1. Create/link the product.
    let productId: Id<"products"> | null = concept.productId ?? null;
    if (!productId || concept.status !== "approved") {
      productId = await ctx.runMutation(internal.researchData.createProductForConcept, {
        conceptId,
      });
    }

    // 2. Generate PRODUCT_BRIEF.md + BVI.md via the text engine.
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

    const systemPrompt = `Kamu adalah **Maya**, Research Analyst di CAST/|FREE.
Dari satu konsep produk yang sudah di-approve, tulis DUA dokumen dengan format PERSIS:

===PRODUCT_BRIEF===
Dokumen brief lengkap (Bahasa Indonesia): positioning, unique value proposition, pesan utama, target & avatar, struktur konten/format, harga & dasar harga, channel jual.

===BVI===
Brand Visual Identity (Bahasa Indonesia): nama brand + tagline, palet warna (3-5 kode HEX), tipografi (font judul + body), tone of voice (3 kata kunci + contoh kalimat), arah visual logo.`;

    const userMessage = [
      `Konsep produk: ${concept.title}`,
      concept.usp ? `USP: ${concept.usp}` : null,
      concept.angle ? `Angle: ${concept.angle}` : null,
      concept.avatar ? `Customer avatar: ${concept.avatar}` : null,
      concept.targetAudience ? `Target audiens: ${concept.targetAudience}` : null,
      concept.format ? `Format: ${concept.format}` : null,
      concept.price ? `Harga: ${concept.price}` : null,
      concept.targetMarket ? `Target market: ${concept.targetMarket}` : null,
      concept.founderAngle ? `Founder angle: ${concept.founderAngle}` : null,
      concept.productType ? `Tipe produk: ${concept.productType}` : null,
      concept.rawText ? `\nCatatan riset:\n${concept.rawText.slice(0, 800)}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    let briefGenerated = false;
    try {
      const call = await callText({
        chosenEngine: runConfig.textEngine,
        modelOverride: runConfig.model || undefined,
        credentials,
        hasEnvOpenAI: Boolean(process.env.OPENAI_API_KEY),
        system: systemPrompt,
        user: userMessage,
        temperature: 0.7,
      });
      if (call.ok) {
        const { brief, bvi } = splitBriefAndBvi(call.text);
        const now = Date.now();
        if (brief) {
          await saveBriefArtifact(ctx, {
            userId,
            productId,
            kind: "product_brief",
            name: "[Maya] PRODUCT_BRIEF.md",
            text: brief,
          });
          briefGenerated = true;
        }
        if (bvi) {
          await saveBriefArtifact(ctx, {
            userId,
            productId,
            kind: "bvi",
            name: "[Maya] BVI.md",
            text: bvi,
          });
          briefGenerated = true;
        }
      }
    } catch {
      // Soft-fail: product exists without artifacts.
    }

    return { ok: true as const, productId, briefGenerated };
  },
});

// Internal helper so the action can store artifacts without public exposure.
async function saveBriefArtifact(
  ctx: any,
  opts: {
    userId: Id<"users">;
    productId: Id<"products">;
    kind: "bvi" | "product_brief";
    name: string;
    text: string;
  }
): Promise<void> {
  const buffer = Buffer.from(opts.text, "utf-8");
  const storageId = await ctx.storage.store(
    new Blob([buffer], { type: "text/markdown" })
  );
  await ctx.runMutation(internal.artifacts.saveInternal, {
    userId: opts.userId,
    productId: opts.productId,
    agentId: "maya",
    kind: opts.kind,
    name: opts.name,
    mimeType: "text/markdown",
    storageId,
    size: buffer.length,
  });
}

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
