"use node";

import { v } from "convex/values";
import OpenAI from "openai";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

const MODEL = "gpt-4o-mini";

// OpenAI pricing in USD per 1M tokens (gpt-4o-mini standard rates).
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
};

function estimateCost(
  model: string,
  usage: {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
  }
): number {
  const p = PRICING[model] ?? { inputPer1M: 0, outputPer1M: 0 };
  return (
    ((usage.prompt_tokens ?? 0) * p.inputPer1M +
      (usage.completion_tokens ?? 0) * p.outputPer1M) /
    1_000_000
  );
}

const SYSTEM_PROMPT = `Kamu adalah "AI Mentor" dari Leveling Digital — mentor AI yang ramah, santai tapi tetap profesional, dan selalu jawab dalam Bahasa Indonesia (gaul-nya dikit, kayak temen yang ngerti banget).

KONTEKS PRODUK:
- Leveling Digital adalah studio digital yang dikerjain tim AI: Maya (Research Analyst), Reza (Copywriter), Dimas (Product Builder), Sari (Web Designer), dan Bayu (Video Producer).
- User pake studio ini buat ngebangun produk digital: ebook, kursus online, template, landing page, riset niche, copywriting, dan konten video.
- Akses studio pake license key (format LD-XXXX-XXXX-XXXX-XXXX) yang diverifikasi ke server lisensi, max 1 device per key.

CARA JAWAB:
- Jawab dalam Bahasa Indonesia. Gaya: santai, jelas, to the point — kayak mentor yang sabar dan pengertian.
- Pakai Markdown ringan: bullet list buat langkah/poin, **bold** buat istilah penting, 1-3 paragraf atau beberapa poin per jawaban. Gak usah muluk-muluk.
- Selalu kasih langkah konkret & contoh yang bisa langsung dipraktekin user, bukan teori doang.
- Kalau topiknya teknis (SEO, FB Ads, funnel, pricing, copywriting, konten, AI tools), jelasin cara kerjanya + rekomendasi realistis sesuai level user.
- Akhiri jawaban dengan 1 pertanyaan lanjutan atau next step biar obrolan jalan terus.

BATASAN:
- JANGAN pernah mengarang fakta soal lisensi, harga, promo, atau kebijakan Leveling Digital. Kalau ditanya hal kayak gitu, arahin ke admin (hubungi support/levelingdigital.com) atau bilang "aku gak punya info itu, tanya admin aja ya".
- JANGAN bikin janji hasil yang gak masuk akal (mis. "dijamin viral"). Kalau gak yakin, akui dan saranin langkah berikutnya.
- JANGAN pura-pura jadi manusia, tapi jangan juga kaku — tetep hangat dan helpful.
- Kalau pertanyaan di luar scope belajar/skill digital, arahkan dengan sopan balik ke topik yang bisa dibantu.`;

export const askMentor = action({
  args: { chatId: v.id("chats"), message: v.string() },
  handler: async (ctx, { chatId, message }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const chat = await ctx.runQuery(internal.mentor.getChatById, { chatId });
    if (chat === null || chat.userId !== userId) {
      throw new Error("Chat not found");
    }

    const text = message.trim();
    const now = Date.now();

    await ctx.runMutation(internal.mentor.insertMessage, {
      chatId,
      userId,
      role: "user",
      content: text,
      createdAt: now,
    });

    const title =
      chat.title === "Chat baru"
        ? text.length > 40
          ? `${text.slice(0, 40)}…`
          : text
        : chat.title;
    await ctx.runMutation(internal.mentor.touchChat, {
      chatId,
      title,
      updatedAt: now,
    });

    const recent = await ctx.runQuery(internal.mentor.getRecentMessages, {
      chatId,
      limit: 14,
    });
    const history = recent
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const content =
        "Belum ada OpenAI API key yang terhubung. Tambahin `OPENAI_API_KEY` di tab API Keys biar aku bisa jawab pertanyaan lu! 🙏";
      await ctx.runMutation(internal.mentor.insertMessage, {
        chatId,
        userId,
        role: "assistant",
        content,
        createdAt: Date.now(),
      });
      return { ok: false as const, content };
    }

    let content: string;
    let ok: boolean;
    try {
      const openai = new OpenAI({ apiKey });
      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        temperature: 0.7,
      });
      content =
        completion.choices[0]?.message?.content?.trim() ||
        "Maaf, aku lagi blank. Coba tanya ulang ya 😅";
      ok = true;

      // Record real usage/cost for the Biaya page.
      const usage = completion.usage;
      if (usage) {
        await ctx.runMutation(internal.usage.insertUsage, {
          userId,
          source: "AI Mentor",
          model: MODEL,
          promptTokens: usage.prompt_tokens ?? 0,
          completionTokens: usage.completion_tokens ?? 0,
          totalTokens: usage.total_tokens ?? 0,
          cost: estimateCost(MODEL, usage),
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.error("OpenAI error:", err);
      content =
        "⚠️ Ada kendala pas manggil OpenAI. Cek API key-nya masih valid & saldonya cukup, terus coba lagi ya.";
      ok = false;
    }

    await ctx.runMutation(internal.mentor.insertMessage, {
      chatId,
      userId,
      role: "assistant",
      content,
      createdAt: Date.now(),
    });

    return { ok, content };
  },
});
