import { test, expect } from "bun:test";

import {
  buildEngineChain,
  ENGINE_DEFAULT_MODELS,
  maskKey,
  type EngineCredential,
} from "../convex/lib/llm";
import { veoStatusToState, extractKieResultUrl } from "../convex/lib/media";
import {
  sanitizeBucketName,
  DEFAULT_BUCKET,
} from "../convex/lib/supabaseStorage";
import {
  extractPexelsQueries,
  injectPexelsPhotos,
} from "../convex/lib/pexels";
import { parseCompetitorAds } from "../convex/lib/scrapeCreators";

// ── maskKey ─────────────────────────────────────────────────────────────────

test("maskKey hides everything except prefix and last 4 chars", () => {
  const masked = maskKey("AIzaSyD-1234567890abcdefGHIJ");
  expect(masked.startsWith("AIza")).toBe(true);
  expect(masked.endsWith("GHIJ")).toBe(true);
  expect(masked).not.toContain("1234567890");
});

test("maskKey handles very short keys", () => {
  expect(maskKey("abc12345")).toBe("••••••••");
});

// ── buildEngineChain (fallback order) ───────────────────────────────────────

const creds = (...engines: string[]): EngineCredential[] =>
  engines.map((engine) => ({
    engine: engine as EngineCredential["engine"],
    apiKey: `key-${engine}`,
  }));

test("chosen engine goes first when its key exists", () => {
  const chain = buildEngineChain("groq", creds("gemini", "groq"), false);
  expect(chain[0].engine).toBe("groq");
  expect(chain[1].engine).toBe("gemini");
});

test("chain follows gemini -> groq -> openai -> anthropic after chosen", () => {
  const all = creds("gemini", "groq", "openai", "anthropic");
  const chain = buildEngineChain("anthropic", all, false);
  expect(chain.map((c) => c.engine)).toEqual([
    "anthropic",
    "gemini",
    "groq",
    "openai",
  ]);
});

test("env OpenAI fallback is appended last when user has no keys", () => {
  const chain = buildEngineChain("gemini", [], true);
  expect(chain.map((c) => c.engine)).toEqual(["openai"]);
  expect(chain[0].fromEnv).toBe(true);
});

test("user OpenAI key prevents duplicate env entry", () => {
  const chain = buildEngineChain(
    "groq",
    creds("groq", "openai"),
    true
  );
  expect(chain.filter((c) => c.engine === "openai").length).toBe(1);
  expect(chain[0].fromEnv).toBe(false);
});

test("default models are rotation-proof", () => {
  // Groq retired llama-3.x on 2026-08-16 — must use gpt-oss.
  expect(ENGINE_DEFAULT_MODELS.groq).toBe("openai/gpt-oss-120b");
  // Hot-swap alias keeps Gemini on the latest stable Flash.
  expect(ENGINE_DEFAULT_MODELS.gemini).toBe("gemini-flash-latest");
});

// ── KIE media helpers ───────────────────────────────────────────────────────

test("veoStatusToState maps successFlag correctly", () => {
  expect(veoStatusToState(1)).toBe("done");
  expect(veoStatusToState(2)).toBe("failed");
  expect(veoStatusToState(3)).toBe("failed");
  expect(veoStatusToState(0)).toBe("pending");
  expect(veoStatusToState(undefined)).toBe("pending");
});

test("extractKieResultUrl handles resultUrls JSON array and raw string", () => {
  expect(
    extractKieResultUrl({ data: { resultUrls: '["https://x.com/v.mp4"]' } })
  ).toBe("https://x.com/v.mp4");
  expect(extractKieResultUrl({ data: { resultUrls: "https://y.com/v.mp4" } })).toBe(
    "https://y.com/v.mp4"
  );
  expect(
    extractKieResultUrl({
      data: { response: { resultJson: '["https://z.com/v.mp4"]' } },
    })
  ).toBe("https://z.com/v.mp4");
  expect(extractKieResultUrl({ data: {} })).toBeNull();
});

// ── Pexels placeholders ─────────────────────────────────────────────────────

test("extractPexelsQueries finds unique keywords", () => {
  const html =
    "<section><!--PEXELS:keto diet--></section><!--PEXELS:gym--><!--PEXELS:keto diet-->";
  expect(extractPexelsQueries(html)).toEqual(["keto diet", "gym"]);
});

test("injectPexelsPhotos replaces markers and strips unmatched ones", () => {
  const html = '<h1>Hero</h1><!--PEXELS:keto--> <p>x</p><!--PEXELS:missing-->';
  const { html: out, injected } = injectPexelsPhotos(html, {
    keto: [{ url: "https://img/keto.jpg", alt: "Keto food", photographer: "Ana" }],
  });
  expect(injected).toBe(1);
  expect(out).toContain('<img src="https://img/keto.jpg"');
  // Unmatched markers are stripped entirely, never left as raw HTML comments.
  expect(out).not.toContain("PEXELS:");
  expect(out).toContain("Ana");
});

// ── Scrape Creators parsing ─────────────────────────────────────────────────

test("parseCompetitorAds defensively maps several payload shapes", () => {
  const shaped = parseCompetitorAds({
    data: [
      { page_name: "Toko A", snapshot: { body: "Promo besar" } },
      { pageName: "Toko B", body: "Diskon 50%", cta: "Shop Now" },
    ],
  });
  expect(shaped.length).toBe(2);
  expect(shaped[0].pageName).toBe("Toko A");
  expect(shaped[1].cta).toBe("Shop Now");
  expect(parseCompetitorAds({})).toEqual([]);
});

// ── Supabase bucket names ───────────────────────────────────────────────────

test("sanitizeBucketName keeps doc-style custom names and defaults sensibly", () => {
  expect(sanitizeBucketName("ld-images")).toBe("ld-images");
  expect(sanitizeBucketName("My Bucket Name!")).toBe("my-bucket-name");
  expect(sanitizeBucketName("   ")).toBe(DEFAULT_BUCKET);
  expect(sanitizeBucketName("")).toBe(DEFAULT_BUCKET);
});
