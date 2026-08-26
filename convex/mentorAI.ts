"use node";

import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  callText,
  estimateModelCost,
  TEXT_ENGINES,
  type EngineCredential,
  type TextEngine,
} from "./lib/llm";

const SYSTEM_PROMPT = `Kamu adalah "AI Mentor" dari CAST/|FREE — mentor AI yang ramah, santai tapi tetap profesional, dan selalu jawab dalam Bahasa Indonesia (gaul-nya dikit, kayak temen yang ngerti banget).

KONTEKS PRODUK:
- CAST/|FREE adalah studio digital yang dikerjain tim AI: Maya (Research Analyst), Reza (Copywriter), Dimas (Product Builder), Sari (Web Designer), dan Bayu (Video Producer).
- User pake studio ini buat ngebangun produk digital: ebook, kursus online, template, landing page, riset niche, copywriting, dan konten video.
- Akses studio pake license key (format LD-XXXX-XXXX-XXXX-XXXX) yang diverifikasi ke server lisensi, max 1 device per key.

CARA JAWAB:
- Jawab dalam Bahasa Indonesia. Gaya: santai, jelas, to the point — kayak mentor yang sabar dan pengertian.
- Pakai Markdown ringan: bullet list buat langkah/poin, **bold** buat istilah penting, 1-3 paragraf atau beberapa poin per jawaban. Gak usah muluk-muluk.
- Selalu kasih langkah konkret & contoh yang bisa langsung dipraktekin user, bukan teori doang.
- Kalau topiknya teknis (SEO, FB Ads, funnel, pricing, copywriting, konten, AI tools), jelasin cara kerjanya + rekomendasi realistis sesuai level user.
- Akhiri jawaban dengan 1 pertanyaan lanjutan atau next step biar obrolan jalan terus.

BATASAN:
- JANGAN pernah mengarang fakta soal lisensi, harga, promo, atau kebijakan CAST/|FREE. Kalau ditanya hal kayak gitu, arahin ke admin (hubungi support/levelingdigital.com) atau bilang "aku gak punya info itu, tanya admin aja ya".
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

    const runConfig = await ctx.runQuery(api.userSettings.resolveRunConfig);
    const keyRows = await ctx.runQuery(internal.providerKeys.getAllPlain, {
      userId,
    });
    const credentials: EngineCredential[] = keyRows
      .filter((row) =>
        TEXT_ENGINES.includes(row.provider as TextEngine)
      )
      .map((row) => ({
        engine: row.provider as TextEngine,
        apiKey: row.key,
      }));

    let content: string;
    let ok: boolean;
    try {
      const call = await callText({
        chosenEngine: runConfig.textEngine,
        modelOverride: runConfig.model || undefined,
        credentials,
        hasEnvOpenAI: Boolean(process.env.OPENAI_API_KEY),
        system: SYSTEM_PROMPT,
        user:
          "Riwayat percakapan:\n" +
          history.map((h) => `[${h.role}] ${h.content}`).join("\n") +
          "\n\nLanjutin percakapan di atas — jawab pesan terakhir user.",
        temperature: 0.7,
      });
      if (!call.ok) throw new Error(call.error ?? "Semua engine teks gagal.");
      content = call.text || "Maaf, aku lagi blank. Coba tanya ulang ya 😅";
      ok = true;

      // Record real usage/cost for the Biaya page.
      await ctx.runMutation(internal.usage.insertUsage, {
        userId,
        source: `AI Mentor (${call.engine})`,
        model: call.model ?? "unknown",
        promptTokens: call.promptTokens,
        completionTokens: call.completionTokens,
        totalTokens: call.promptTokens + call.completionTokens,
        cost: estimateModelCost(
          call.model ?? "",
          call.promptTokens,
          call.completionTokens
        ),
        createdAt: Date.now(),
      });
    } catch (err) {
      console.error("Text engine error:", err);
      content =
        "⚠️ Ada kendala pas manggil engine AI. Cek API key lu di Pengaturan (minimal satu engine valid), terus coba lagi ya.";
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
