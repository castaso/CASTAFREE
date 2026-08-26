"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  extractAdBriefs,
  extractHtml,
  renderEbookPdf,
  splitEbooks,
} from "./lib/ebookPdf";

const IMAGE_MODEL = "gpt-image-1";
const IMAGE_COST_PER_IMAGE = 0.042; // USD per 1024x1024 (medium quality)
const MAX_AD_IMAGES = 5;
const MAX_EBOOKS = 3;

const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
};

function estimateCost(
  model: string,
  usage: { prompt_tokens?: number | null; completion_tokens?: number | null }
): number {
  const p = PRICING[model] ?? { inputPer1M: 0, outputPer1M: 0 };
  return (
    ((usage.prompt_tokens ?? 0) * p.inputPer1M +
      (usage.completion_tokens ?? 0) * p.outputPer1M) /
    1_000_000
  );
}

const AGENT_PROMPTS: Record<string, string> = {
  maya: `Kamu adalah **Maya**, Research Analyst di CAST/|FREE.
Tugas kamu: riset & validasi pasar, lalu menyusun konsep produk dan brand guide.

Berdasarkan topik yang diberikan, susun output berikut dengan format PERSIS seperti ini:

## Riset Pasar
Gambaran pasar (potensi, tren), kompetitor utama, target audiens — padat dan data-driven.

## 5 Konsep Produk
Tepat 5 konsep, masing-masing dalam format:
- **Konsep n: [Judul]** — angle, target audiens, format produk, estimasi harga jual (Rp), alasan layak jual.

## Brief Produk Terpilih
Pilih 1 konsep paling kuat, lalu buat brief lengkap: positioning, unique value proposition, pesan utama, struktur konten.

## Brand Visual Identity (BVI)
- Nama brand + tagline
- Palet warna: 3-5 warna dengan kode HEX
- Tipografi: font judul + font body (sebutkan nama font)
- Tone of voice: 3 kata kunci + contoh kalimat
- Arah visual logo: deskripsi konsep logo

Jawab dalam Bahasa Indonesia. Jangan ngasal — kalau gak punya data spesifik, akui aja dan kasih saran.`,

  reza: `Kamu adalah **Reza**, Copywriter di CAST/|FREE.
Tugas kamu: bikin 5 script UGC, 5 image ad, dan caption Meta Ads.

**Input dari Maya (Research Analyst):**
{RESEARCH}

Susun output dengan format PERSIS seperti ini:

## 5 Script UGC
Tepat 5 script video UGC (30-60 detik), masing-masing:
- **UGC n: [Judul]** — persona kreator, HOOK (3 detik pertama), BODY (masalah -> solusi -> benefit), CTA penutup. Tulis dialognya siap dibaca.

## Image Ads
Tepat 5 brief image ad, masing-masing DIPISAH dengan marker persis seperti ini (satu marker per brief, di baris sendiri):
===IMAGE AD 1: [Judul singkat]===
Deskripsi visual lengkap untuk AI image generator: komposisi, subjek, gaya, warna (pakai HEX dari BVI), teks overlay pendek bila perlu.

(ulangi sampai ===IMAGE AD 5: ...===)

## Caption Meta Ads
1 caption iklan Meta (Facebook/Instagram): hook, body copy, emoji secukupnya, CTA, plus 5 hashtag relevan.

Jawab dalam Bahasa Indonesia. Pastikan ada TEPAT 5 marker ===IMAGE AD n===.`,

  dimas: `Kamu adalah **Dimas**, Product Builder di CAST/|FREE.
Tugas kamu: nulis TEPAT 3 ebook lengkap yang siap dijual sebagai PDF.

**Input dari Maya (Research Analyst):**
{RESEARCH}

**Input dari Reza (Copywriter):**
{COPY}

Aturan output — WAJIB ikut format ini:
- Tulis TEPAT 3 ebook terpisah.
- Setiap ebook DIMULAI dengan marker persis seperti ini (di baris sendiri):
===EBOOK 1: [Judul Ebook]===
===EBOOK 2: [Judul Ebook]===
===EBOOK 3: [Judul Ebook]===
- Isi tiap ebook: gunakan heading markdown (# untuk judul bagian, ## untuk sub-bagian), paragraf mengalir, bullet list, dan numbered list.
- Tiap ebook minimal 5 bagian (# heading) + pengantar + penutup/CTA. Konten harus substansial, edukatif, dan siap dibaca pembeli — bukan outline.
- Semua dalam Bahasa Indonesia.

Jangan tulis apa pun di luar ketiga ebook (tanpa pembuka/penutup).`,

  sari: `Kamu adalah **Sari**, Web Designer di CAST/|FREE.
Tugas kamu: bikin landing page LENGKAP 14 section dalam SATU file HTML.

**Input dari Dimas (Product Builder):**
{PRODUCT}

**Input dari Reza (Copywriter):**
{COPY}

**Input dari Maya (Research Analyst) — BVI:**
{RESEARCH}

Aturan output:
1. Mulai dengan 2-3 kalimat ringkasan konsep visual.
2. Lalu keluarkan SATU blok kode yang dimulai dengan \`\`\`html dan diakhiri \`\`\`
3. File HTML harus lengkap & self-contained (<!DOCTYPE html>, inline <style>, responsive, tanpa library eksternal).
4. WAJIB punya TEPAT 14 section berurutan: Hero, Problem, Solusi, Benefit, Fitur, Isi Produk, Cara Pakai, Testimoni, Harga, Bonus, Garansi, FAQ, CTA Final, Footer.
5. Pakai warna & font dari BVI Maya, copy dari Reza, harga & isi dari Dimas. Copy dalam Bahasa Indonesia.

Jangan potong kode — tulis HTML sampai selesai.`,

  bayu: `Kamu adalah **Bayu**, Video Producer di CAST/|FREE.
Tugas kamu: nyiapin setting image KIE + prompt video VEO per scene.

**Input dari Sari (Web Designer):**
{DESIGN}

**Input dari Reza (Copywriter):**
{COPY}

**Input dari Dimas (Product Builder):**
{PRODUCT}

**Input dari Maya (Research Analyst) — BVI:**
{RESEARCH}

Susun output dengan format PERSIS seperti ini:

## Setting Image KIE
Untuk setiap visual yang dibutuhkan (produk, UGC thumbnail, ads, landing page):
- **[Nama visual]** — model rekomendasi, aspect ratio, style preset, prompt positif lengkap (Inggris), negative prompt, dan parameter lain (steps/CFG/guidance jika relevan).

## Prompt Video VEO Per Scene
Breakdown video iklan jadi scene-scene. Untuk TIAP scene:
- **Scene n ([durasi detik])** — deskripsi visual, gerakan kamera, subjek & aksi, mood/lighting, VO/narasi, teks overlay.
- Prompt VEO (Inggris, satu paragraf siap tempel ke Google VEO).

Tutup dengan rekomendasi distribusi (platform + rasio).

Jawab dalam Bahasa Indonesia (prompt KIE & VEO tetap bahasa Inggris).`,
};

const AGENT_ORDER = ["maya", "reza", "dimas", "sari", "bayu"] as const;
const AGENT_NAMES: Record<string, string> = {
  maya: "Maya",
  reza: "Reza",
  dimas: "Dimas",
  sari: "Sari",
  bayu: "Bayu",
};

/** Validate a requested agent subset, preserving canonical order. */
export function normalizeAgentIds(agentIds?: string[]): string[] {
  if (!agentIds || agentIds.length === 0) return [...AGENT_ORDER];
  const set = new Set(
    agentIds.filter((id): id is (typeof AGENT_ORDER)[number] =>
      (AGENT_ORDER as readonly string[]).includes(id)
    )
  );
  return AGENT_ORDER.filter((id) => set.has(id));
}

// The recursive type inference from ctx.runMutation inside a loop confuses TS.
// We use a function declaration to break the cycle.
function runAgentsHandler(
  ctx: any,
  args: { topic: string; agentIds?: string[]; productId?: Id<"products"> }
): Promise<
  | {
      ok: true;
      runId: Id<"pipelineRuns">;
      imagesSaved: number;
      imagesFailed: number;
      artifactsSaved: number;
      artifactsFailed: number;
      outputs: { agent: string; output: string }[];
    }
  | { ok: false; error: string }
> {
  return (async (ctx, { topic, agentIds, productId }) => {
    const rawUserId = await getAuthUserId(ctx);
    if (rawUserId === null) throw new Error("Not authenticated");
    const userId: Id<"users"> = rawUserId;

    const selectedAgents = normalizeAgentIds(agentIds);
    if (selectedAgents.length === 0) {
      return { ok: false as const, error: "Pilih minimal satu agent." };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "OPENAI_API_KEY belum diset." };
    }

    const model = await ctx.runQuery(api.userSettings.resolveModel);
    const openai = new OpenAI({ apiKey });
    const now = Date.now();

    // Product context: name + outputs from the latest completed run.
    let productName: string | null = null;
    const priorOutputs: Record<string, string> = await ctx.runQuery(
      api.pipelineData.getProductContext,
      { productId: productId ?? ("000000000000000000000000" as Id<"products">) }
    );

    const runningContext: Record<string, string> = { TOPIC: topic };
    for (const [agentId, output] of Object.entries(priorOutputs)) {
      runningContext[`${agentId.toUpperCase()}_OUTPUT`] = output;
      if (agentId === "maya") runningContext.RESEARCH = output;
      if (agentId === "reza") runningContext.COPY = output;
      if (agentId === "dimas") runningContext.PRODUCT = output;
      if (agentId === "sari") runningContext.DESIGN = output;
    }

    const product = await ctx.runQuery(api.products.get, {
      id: productId ?? ("000000000000000000000000" as Id<"products">),
    });
    if (productId && product === null) {
      return { ok: false as const, error: "Produk tidak ditemukan." };
    }
    if (product) {
      productName = product.name;
      runningContext.PRODUCT_NAME = product.name;
    }

    const runTopic = product ? `${product.name} — ${topic}` : topic;
    const isFullRun =
      selectedAgents.length === AGENT_ORDER.length && !productId;

    const runId = await ctx.runMutation(internal.pipelineData.createRun, {
      userId,
      topic: runTopic,
      createdAt: now,
      productId,
      agentIds: selectedAgents,
    });

    for (let i = 0; i < selectedAgents.length; i++) {
      const id = selectedAgents[i];
      const name = AGENT_NAMES[id] ?? id;

      const previousId = i > 0 ? selectedAgents[i - 1] : null;
      const priorChain = previousId
        ? runningContext[`${previousId.toUpperCase()}_OUTPUT`] ?? ""
        : "";
      const inputText =
        i === 0
          ? product
            ? `Lanjut kerjain produk "${productName}" untuk topik: ${topic}`
            : topic
          : `Lanjutin pipeline untuk topik: "${topic}"\n\nHasil agent sebelumnya:\n${priorChain}`;

      const taskId = await ctx.runMutation(internal.pipelineData.createTask, {
        runId,
        userId,
        agentId: id,
        agentName: name,
        step: i + 1,
        input: inputText,
        status: "running",
        createdAt: Date.now(),
        model,
      });

      let systemPrompt = AGENT_PROMPTS[id] ?? "";
      for (const [key, val] of Object.entries(runningContext)) {
        systemPrompt = systemPrompt.replace(new RegExp(`\\{${key}\\}`, "g"), val);
      }

      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: inputText },
          ],
          temperature: 0.7,
        });

        const output =
          completion.choices[0]?.message?.content?.trim() ?? "—";

        const usage = completion.usage;
        const promptTokens = usage?.prompt_tokens ?? 0;
        const completionTokens = usage?.completion_tokens ?? 0;
        const cost = estimateCost(model, usage ?? {});

        await ctx.runMutation(internal.pipelineData.completeTask, {
          taskId,
          output,
          promptTokens,
          completionTokens,
          cost,
          completedAt: Date.now(),
        });

        await ctx.runMutation(internal.usage.insertUsage, {
          userId,
          source: `Pipeline: ${name}`,
          model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          cost,
          createdAt: Date.now(),
        });

        runningContext[`${id.toUpperCase()}_OUTPUT`] = output;
        if (id === "maya") runningContext.RESEARCH = output;
        if (id === "reza") runningContext.COPY = output;
        if (id === "dimas") runningContext.PRODUCT = output;
        if (id === "sari") runningContext.DESIGN = output;
      } catch (err) {
        await ctx.runMutation(internal.pipelineData.failTask, {
          taskId,
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: Date.now(),
        });

        await ctx.runMutation(internal.pipelineData.failRun, {
          runId,
          error: err instanceof Error ? err.message : "Unknown error",
          completedAt: Date.now(),
        });

        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Pipeline gagal.",
        };
      }
    }

    // ── Artifacts: BVI, ad images, ebooks, landing page, KIE/VEO, Scalev ──
    let artifactsSaved = 0;
    let artifactsFailed = 0;
    let imagesSaved = 0;
    let imagesFailed = 0;

    const saveTextArtifact = async (
      kind:
        | "bvi"
        | "image_ad_brief"
        | "landing_page"
        | "kie_veo_sheet"
        | "scalev_pack",
      agentId: string,
      name: string,
      text: string,
      mimeType = "text/markdown"
    ): Promise<boolean> => {
      try {
        const buffer = Buffer.from(text, "utf-8");
        const storageId = await ctx.storage.store(
          new Blob([buffer], { type: mimeType })
        );
        await ctx.runMutation(internal.artifacts.saveInternal, {
          userId,
          runId,
          productId,
          agentId,
          kind,
          name,
          mimeType,
          storageId,
          size: buffer.length,
        });
        artifactsSaved += 1;
        return true;
      } catch {
        artifactsFailed += 1;
        return false;
      }
    };

    // Maya — Brand Visual Identity + konsep produk
    if (selectedAgents.includes("maya") && runningContext.RESEARCH) {
      await saveTextArtifact(
        "bvi",
        "maya",
        `[Maya] ${topic} — Konsep & BVI.md`,
        runningContext.RESEARCH
      );
    }

    // Reza — image ad briefs artifact + generate 5 ad images to Galeri
    if (selectedAgents.includes("reza") && runningContext.COPY) {
      const briefs = extractAdBriefs(runningContext.COPY);
      if (briefs.length > 0) {
        const briefDoc = briefs
          .map((b) => `===IMAGE AD: ${b.title}===\n\n${b.brief}`)
          .join("\n\n---\n\n");
        await saveTextArtifact(
          "image_ad_brief",
          "reza",
          `[Reza] ${topic} — Brief Image Ads.md`,
          briefDoc
        );
      }

      const bviSnippet = (runningContext.RESEARCH ?? "").slice(-600);
      for (const [i, brief] of briefs.slice(0, MAX_AD_IMAGES).entries()) {
        try {
          const res = await openai.images.generate({
            model: IMAGE_MODEL,
            prompt: `${brief.brief.slice(0, 900)}\n\nKonteks brand (BVI):\n${bviSnippet}\n\nRasio persegi, gaya iklan digital premium.`,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
            output_format: "png",
          });
          const b64 = res.data?.[0]?.b64_json;
          if (!b64) throw new Error("OpenAI tidak mengembalikan data gambar.");

          const buffer = Buffer.from(b64, "base64");
          const storageId = await ctx.storage.store(
            new Blob([buffer], { type: "image/png" })
          );

          await ctx.runMutation(internal.gallery.saveInternal, {
            userId,
            storageId,
            name: `[Reza] ${topic} — Image Ad ${i + 1}.png`,
            mimeType: "image/png",
            size: buffer.length,
          });

          await ctx.runMutation(internal.usage.insertUsage, {
            userId,
            source: "Pipeline: Image Ad AI",
            model: IMAGE_MODEL,
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            cost: IMAGE_COST_PER_IMAGE,
            createdAt: Date.now(),
          });

          imagesSaved += 1;
        } catch {
          imagesFailed += 1;
        }
      }
    }

    // Dimas — 3 ebook PDF siap jual
    if (selectedAgents.includes("dimas") && runningContext.PRODUCT) {
      const ebooks = splitEbooks(runningContext.PRODUCT);
      for (const [i, ebook] of ebooks.slice(0, MAX_EBOOKS).entries()) {
        try {
          const pdfBytes = await renderEbookPdf(ebook);
          const storageId = await ctx.storage.store(
            new Blob([pdfBytes], { type: "application/pdf" })
          );
          const safeTitle =
            ebook.title.replace(/[^\w\s-]/g, "").trim().slice(0, 60) ||
            `Ebook ${i + 1}`;
          await ctx.runMutation(internal.artifacts.saveInternal, {
            userId,
            runId,
            productId,
            agentId: "dimas",
            kind: "ebook_pdf",
            name: `[Dimas] ${safeTitle}.pdf`,
            mimeType: "application/pdf",
            storageId,
            size: pdfBytes.length,
          });
          artifactsSaved += 1;
        } catch {
          artifactsFailed += 1;
        }
      }
    }

    // Sari — landing page 14-section (HTML self-contained)
    if (selectedAgents.includes("sari") && runningContext.DESIGN) {
      const html = extractHtml(runningContext.DESIGN);
      if (html) {
        await saveTextArtifact(
          "landing_page",
          "sari",
          `[Sari] ${topic} — Landing Page.html`,
          html,
          "text/html"
        );
      } else {
        await saveTextArtifact(
          "landing_page",
          "sari",
          `[Sari] ${topic} — Konsep Landing Page.md`,
          runningContext.DESIGN
        );
      }
    }

    // Bayu — setting image KIE + prompt video VEO per scene
    if (selectedAgents.includes("bayu") && runningContext.BAYU_OUTPUT) {
      await saveTextArtifact(
        "kie_veo_sheet",
        "bayu",
        `[Bayu] ${topic} — Setting KIE & Prompt VEO.md`,
        runningContext.BAYU_OUTPUT
      );
    }

    // Scalev stub — daftarkan produk + export pack (full pipeline only)
    if (isFullRun) {
      try {
        const slug = topic
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 60);
      await ctx.runMutation(internal.products.createInternal, {
        userId,
        name: topic.slice(0, 80),
        slug,
        status: "published",
        agent: "Dimas",
      });
      const scalevPack = [
        `# Scalev Export Pack — ${topic}`,
        "",
        `> Copy-paste isi di bawah ke form produk Scalev kamu.`,
        "",
        "## Nama Produk",
        topic,
        "",
        "## Slug",
        slug,
        "",
        "## Deskripsi Singkat",
        (runningContext.COPY ?? "").slice(0, 600),
        "",
        "## Harga & Positioning",
        (runningContext.PRODUCT ?? "").slice(0, 600),
        "",
        "## Caption Iklan",
        (() => {
          const meta = /## Caption Meta Ads\s*\n([\s\S]*?)(?=\n## |\n$|$)/.exec(
            runningContext.COPY ?? ""
          );
          return meta?.[1]?.trim() ?? "(ambil dari output Reza bagian Caption Meta Ads)";
        })(),
        "",
        "## Catatan",
        "- Upload sampul produk dari Galeri (file [Reza] ... Image Ad).",
        "- Ebook PDF ada di menu Pipeline/hasil run ini.",
        "",
        "— Dibuat otomatis oleh CASTAFREE Pipeline",
      ].join("\n");
      await saveTextArtifact(
        "scalev_pack",
        "dimas",
        `[Scalev] ${topic} — Export Pack.md`,
        scalevPack
      );
      } catch {
        artifactsFailed += 1;
      }
    }

    await ctx.runMutation(internal.pipelineData.completeRun, {
      runId,
      completedAt: Date.now(),
      imagesSaved,
      imagesFailed,
    });

    return {
      ok: true as const,
      runId,
      imagesSaved,
      imagesFailed,
      artifactsSaved,
      artifactsFailed,
      outputs: selectedAgents.map((id) => ({
        agent: id,
        output: runningContext[`${id.toUpperCase()}_OUTPUT`] ?? "",
      })),
    };
  })(ctx, args);
}

export const runAgents = action({
  args: {
    topic: v.string(),
    agentIds: v.optional(v.array(v.string())),
    productId: v.optional(v.id("products")),
  },
  handler: runAgentsHandler,
});

// Back-compat alias used by PipelinePage: full pipeline, no product binding.
export const runPipeline = action({
  args: { topic: v.string() },
  handler: runAgentsHandler,
});
