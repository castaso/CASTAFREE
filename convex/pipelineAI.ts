"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const MODEL = "gpt-4o-mini";
const IMAGE_MODEL = "gpt-image-1";
const IMAGE_COST_PER_IMAGE = 0.042; // USD per 1024x1024 (medium quality)

const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
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
  maya: `Kamu adalah **Maya**, Research Analyst di Leveling Digital.
Tugas kamu: riset pasar, niche, dan kompetitor.

Berdasarkan topik yang diberikan, berikan:
1. **Gambaran pasar** — seberapa besar potensi, tren terkini
2. **Kompetitor utama** — siapa yang udah main di niche ini
3. **Target audiens** — siapa yang paling mungkin beli
4. **Rekomendasi produk** — format produk apa yang paling cocok

Jawab dalam Bahasa Indonesia, maksimal 3 paragraf, to the point dan data-driven.
Jangan ngasal — kalau gak punya data spesifik, akui aja dan kasih saran.`,

  reza: `Kamu adalah **Reza**, Copywriter di Leveling Digital.
Tugas kamu: nulis copy iklan, email, dan konten yang bikin konversi.

**Input dari Maya (Research Analyst):**
{RESEARCH}

Berdasarkan riset di atas dan topik yang dikasih:
1. **Angle/value proposition** — apa yang bikin produk ini beda
2. **Headline + subheadline** — 3 opsi yang strong
3. **Email copy singkat** — buat teaser/promo (max 100 kata)
4. **CTA yang nge-convert**

Jawab dalam Bahasa Indonesia, to the point, langsung ke copy-nya.`,

  dimas: `Kamu adalah **Dimas**, Product Builder di Leveling Digital.
Tugas kamu: ngebangun produk digital dari konsep sampai siap jual.

**Input dari Maya (Research Analyst):**
{RESEARCH}

**Input dari Reza (Copywriter):**
{COPY}

Berdasarkan riset + copy di atas:
1. **Format produk** — ebook, kursus, template, atau bundle?
2. **Struktur konten** — outline per bab/modul (5-7 poin)
3. **Harga jual** — range harga yang realistis
4. **Teknis pembuatan** — tools & platform yang perlu disiapin

Jawab dalam Bahasa Indonesia, jelas, step-by-step.`,

  sari: `Kamu adalah **Sari**, Web Designer di Leveling Digital.
Tugas kamu: desain landing page dan visual yang clean dan konversif.

**Input dari Dimas (Product Builder):**
{PRODUCT}

**Input dari Reza (Copywriter):**
{COPY}

Berdasarkan produk + copy di atas:
1. **Konsep visual** — warna, font, vibe yang cocok
2. **Struktur landing page** — section by section (hero → benefit → isi → testimonial → CTA)
3. **Elemen desain** — ilustrasi, icon, screenshot yang perlu dibikin
4. **Ukuran/halaman** — jumlah halaman atau slide

Jawab dalam Bahasa Indonesia, deskriptif, biayangin visualnya.`,

  bayu: `Kamu adalah **Bayu**, Video Producer di Leveling Digital.
Tugas kamu: produksi script dan storyboard video iklan & konten.

**Input dari Sari (Web Designer):**
{DESIGN}

**Input dari Reza (Copywriter):**
{COPY}

**Input dari Dimas (Product Builder):**
{PRODUCT}

Berdasarkan produk + copy + visual di atas:
1. **Konsep video** — jenis video (tutorial, testimonial, iklan pendek)
2. **Script video** — narasi 30-60 detik, breakdown per scene
3. **Visual guide** — cuplikan layar, animasi, atau footage yang diperlukan
4. **Distribusi** — platform (TikTok, IG, YouTube) dan format rasio

Jawab dalam Bahasa Indonesia, langsung ke script dan storyboard-nya.`,
};

// The recursive type inference from ctx.runMutation inside a loop confuses TS.
// We use a function declaration to break the cycle.
function runPipelineHandler(
  ctx: any,
  args: { topic: string }
): Promise<
  | {
      ok: true;
      runId: Id<"pipelineRuns">;
      imagesSaved: number;
      imagesFailed: number;
      outputs: { agent: string; output: string }[];
    }
  | { ok: false; error: string }
> {
  return (async (ctx, { topic }) => {
    const rawUserId = await getAuthUserId(ctx);
    if (rawUserId === null) throw new Error("Not authenticated");
    const userId: Id<"users"> = rawUserId;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "OPENAI_API_KEY belum diset." };
    }

    const openai = new OpenAI({ apiKey });
    const now = Date.now();

    const runId = await ctx.runMutation(internal.pipelineData.createRun, {
      userId,
      topic,
      createdAt: now,
    });

    const agentOrder = ["maya", "reza", "dimas", "sari", "bayu"];
    const agentNames = ["Maya", "Reza", "Dimas", "Sari", "Bayu"];
    const runningContext: Record<string, string> = { TOPIC: topic };

    for (let i = 0; i < agentOrder.length; i++) {
      const id = agentOrder[i];
      const name = agentNames[i];
      const inputText =
        i === 0
          ? topic
          : `Lanjutin pipeline untuk topik: "${topic}"\n\nHasil agent sebelumnya:\n${runningContext[agentOrder[i - 1].toUpperCase()] ?? ""}`;

      const taskId = await ctx.runMutation(internal.pipelineData.createTask, {
        runId,
        userId,
        agentId: id,
        agentName: name,
        step: i + 1,
        input: inputText,
        status: "running",
        createdAt: Date.now(),
      });

      let systemPrompt = AGENT_PROMPTS[id] ?? "";
      for (const [key, val] of Object.entries(runningContext)) {
        systemPrompt = systemPrompt.replace(new RegExp(`\\{${key}\\}`, "g"), val);
      }

      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
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
        const cost = estimateCost(MODEL, usage ?? {});

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
          model: MODEL,
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

    // ── Generate & auto-save output images to Galeri ──
    let imagesSaved = 0;
    let imagesFailed = 0;

    const productSnippet = (runningContext.PRODUCT ?? topic).slice(0, 700);
    const copySnippet = (runningContext.COPY ?? "").slice(0, 300);
    const designSnippet = (
      runningContext.DESIGN ?? runningContext.PRODUCT ?? topic
    ).slice(0, 700);

    const imageSpecs = [
      {
        name: `[Pipeline] ${topic} — Sampul Produk.png`,
        prompt: `Buat sampul ebook digital premium untuk topik "${topic}".

Konsep produk:
${productSnippet}

Headline utama:
${copySnippet}

Gaya: modern, profesional, warna menonjol, tipografi tebal, judul singkat dalam Bahasa Indonesia (maks 4 kata), tanpa teks panjang.`,
      },
      {
        name: `[Pipeline] ${topic} — Hero Landing Page.png`,
        prompt: `Buat ilustrasi hero section untuk landing page produk digital bertema "${topic}".

Arahan desain:
${designSnippet}

Gaya: clean, modern, premium, rasio persegi, tanpa elemen UI browser, tanpa teks panjang.`,
      },
    ];

    for (const spec of imageSpecs) {
      try {
        const res = await openai.images.generate({
          model: IMAGE_MODEL,
          prompt: spec.prompt,
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
          name: spec.name,
          mimeType: "image/png",
          size: buffer.length,
        });

        await ctx.runMutation(internal.usage.insertUsage, {
          userId,
          source: "Pipeline: Gambar AI",
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
      outputs: agentOrder.map((id) => ({
        agent: id,
        output: runningContext[`${id.toUpperCase()}_OUTPUT`] ?? "",
      })),
    };
  })(ctx, args);
}

export const runPipeline = action({
  args: { topic: v.string() },
  handler: runPipelineHandler,
});
