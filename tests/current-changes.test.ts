import { readFileSync } from "node:fs";
import { test, expect } from "bun:test";

// ── Mirrored from shipped source (convex/pipelineAI.ts) ────────────────
const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
};
const IMAGE_COST_PER_IMAGE = 0.042; // USD per 1024x1024 (medium quality)

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

test("gpt-4o-mini cost math matches documented $0.15/$0.60 rates", () => {
  // 1M input + 1M output = $0.15 + $0.60 = $0.75
  expect(
    estimateCost("gpt-4o-mini", {
      prompt_tokens: 1_000_000,
      completion_tokens: 1_000_000,
    })
  ).toBeCloseTo(0.75, 6);
  // Typical chat: 500 input + 300 output
  expect(
    estimateCost("gpt-4o-mini", { prompt_tokens: 500, completion_tokens: 300 })
  ).toBeCloseTo(0.000255, 9);
  // No usage -> no cost
  expect(estimateCost("gpt-4o-mini", {})).toBe(0);
  // Unknown model -> free
  expect(estimateCost("unknown-model", { prompt_tokens: 1000 })).toBe(0);
});

test("image generation cost constant matches gpt-image-1 rate", () => {
  expect(IMAGE_COST_PER_IMAGE).toBe(0.042);
});

test("shipped pipelineAI.ts still carries the expected pricing + image constants", () => {
  const src = readFileSync("convex/pipelineAI.ts", "utf8");
  expect(src).toContain("IMAGE_COST_PER_IMAGE = 0.042");
  // Images must be auto-saved to the gallery via the internal mutation
  expect(src).toContain("internal.gallery.saveInternal");
  // Multi-engine BYOK: text calls route through the unified LLM layer
  expect(src).toContain("callText");
});

test("unified llm layer keeps multi-provider pricing and fallback chain", () => {
  const src = readFileSync("convex/lib/llm.ts", "utf8");
  expect(src).toContain('"gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 }');
  expect(src).toContain('groq: "openai/gpt-oss-120b"');
  expect(src).toContain('gemini: "gemini-flash-latest"');
});

test("shipped GalleryPage.tsx keeps MIME filter mapping, 10MB cap, storage URL format", () => {
  const src = readFileSync("src/pages/dashboard/GalleryPage.tsx", "utf8");
  expect(src).toContain('png: "image/png"');
  expect(src).toContain('jpeg: "image/jpeg"');
  expect(src).toContain('webp: "image/webp"');
  expect(src).toContain('gif: "image/gif"');
  expect(src).toContain("MAX_SIZE = 10 * 1024 * 1024");
  expect(src).toContain("`/api/storage/${item.storageId}`");
});

test("shipped gallery.ts exposes saveInternal for the pipeline action", () => {
  const src = readFileSync("convex/gallery.ts", "utf8");
  expect(src).toContain("export const saveInternal = internalMutation");
});

test("shipped schema.ts records imagesSaved/imagesFailed on pipelineRuns", () => {
  const src = readFileSync("convex/schema.ts", "utf8");
  expect(src).toContain("imagesSaved: v.optional(v.number())");
  expect(src).toContain("imagesFailed: v.optional(v.number())");
});

test("shipped PipelinePage.tsx surfaces image + artifact results to the user", () => {
  const src = readFileSync("src/pages/dashboard/PipelinePage.tsx", "utf8");
  expect(src).toContain("gambar AI masuk Galeri");
  expect(src).toContain("Buka Galeri");
  expect(src).toContain("run.imagesSaved");
  // Aspirational deliverables: artifacts panel on completed runs
  expect(src).toContain("api.artifacts.listByRun");
  expect(src).toContain("Hasil &amp; File Siap Pakai");
});

test("shipped schema.ts stores per-run AI artifacts (BVI, ebooks, landing page, KIE/VEO, Scalev)", () => {
  const src = readFileSync("convex/schema.ts", "utf8");
  expect(src).toContain("artifacts: defineTable");
  for (const kind of [
    '"bvi"',
    '"image_ad_brief"',
    '"ebook_pdf"',
    '"landing_page"',
    '"kie_veo_sheet"',
    '"scalev_pack"',
  ]) {
    expect(src).toContain(kind);
  }
});

test("shipped pipelineAI.ts demands doc-exact deliverables from every agent", () => {
  const src = readFileSync("convex/pipelineAI.ts", "utf8");
  expect(src).toContain("Brand Visual Identity (BVI)");
  expect(src).toContain("===IMAGE AD");
  expect(src).toContain("===EBOOK");
  expect(src).toContain("TEPAT 14 section");
  expect(src).toContain("===SETTING IMAGES===");
  expect(src).toContain("internal.artifacts.saveInternal");
  expect(src).toContain("internal.products.createInternal");
});
