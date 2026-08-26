import { test, expect } from "bun:test";

import {
  buildDimasContext,
  normalizeAgentIds,
} from "../convex/pipelineAI";
import {
  parseCaptionBlock,
  splitUgcScripts,
  splitBayuSheet,
} from "../convex/lib/ugc";
import { extractAdBriefs } from "../convex/lib/ebookPdf";

// ── buildDimasContext (doc 09 step 2) ───────────────────────────────────────

test("buildDimasContext returns null when both overrides are empty", () => {
  expect(buildDimasContext()).toBeNull();
  expect(buildDimasContext("", "   ")).toBeNull();
});

test("buildDimasContext includes labeled lines for filled inputs", () => {
  const ctx = buildDimasContext("Atomic Habits", "Fokus pada pemula sibuk");
  expect(ctx).toContain("Reference book");
  expect(ctx).toContain("Atomic Habits");
  expect(ctx).toContain("Angle WAJIB dipakai");
  expect(ctx).toContain("Fokus pada pemula sibuk");
});

test("buildDimasContext handles only one field set and trims input", () => {
  const ctx = buildDimasContext(undefined, "  angle x  ");
  expect(ctx).not.toContain("Reference book");
  expect(ctx).toContain("angle x");
});

const REZA_OUTPUT = [
  "## 5 Script UGC",
  "===UGC 1: Haul Produk===",
  "Persona: Mahasiswa kreatif",
  "HOOK: \"Kalian masih bayar mahal?\"",
  "BODY: masalah -> solusi -> benefit",
  "CTA: Cek link di bio!",
  "Caption Meta:",
  "Primary text: Ganti cara kerja lu dengan ini 🔥",
  "Headline: Hemat 10 Jam/Minggu",
  "Description: Mulai hari ini.",
  "",
  "===UGC 2: Testimoni===",
  "Persona: Freelancer",
  "HOOK: Awas, ini bikin ketagihan",
  "BODY: cerita transformasi",
  "CTA: Swipe up sekarang",
].join("\n");

test("splitUgcScripts extracts sections with paired caption triplets", () => {
  const scripts = splitUgcScripts(REZA_OUTPUT);
  expect(scripts.length).toBe(2);
  expect(scripts[0]).toMatchObject({ index: 1, title: "Haul Produk" });
  expect(scripts[0].script).toContain("HOOK:");
  expect(scripts[0].script).not.toContain("Primary text");
  expect(scripts[0].caption).toEqual({
    primaryText: "Ganti cara kerja lu dengan ini 🔥",
    headline: "Hemat 10 Jam/Minggu",
    description: "Mulai hari ini.",
  });
  // Second script has no caption block
  expect(scripts[1].caption).toBeNull();
});

test("parseCaptionBlock tolerates missing fields and aliases", () => {
  const partial = parseCaptionBlock(
    "Primary text: Copy saja\nHeadline: Judul"
  );
  expect(partial).toEqual({
    primaryText: "Copy saja",
    headline: "Judul",
    description: "",
  });
  expect(parseCaptionBlock("tidak ada caption di sini")).toBeNull();
});

test("extractAdBriefs keeps visual brief and pairs its own caption", () => {
  const output = [
    "===IMAGE AD 1: Flatlay===",
    "Foto flatlay produk latar putih.",
    "Caption Meta:",
    "Primary text: Diskon launch week",
    "Headline: Launching Hari Ini",
    "Description: Stok terbatas",
    "",
    "===IMAGE AD 2: Hero===",
    "Hero shot dramatis tanpa caption block.",
  ].join("\n");

  const briefs = extractAdBriefs(output);
  expect(briefs.length).toBe(2);
  expect(briefs[0].brief).toContain("flatlay");
  expect(briefs[0].brief).not.toContain("Primary text");
  expect(briefs[0].caption?.headline).toBe("Launching Hari Ini");
  expect(briefs[1].caption).toBeNull();
});

// ── splitBayuSheet (doc 11) ─────────────────────────────────────────────────

const BAYU_SHEET = [
  "===SETTING IMAGES===",
  "===SETTING IMAGE 1: Haul Produk===",
  "Prompt: young indonesian man holding product, studio light",
  "Rasio: 9:16",
  "Style: UGC casual",
  "",
  "===PROMPT VEO===",
  "- Scene 1 (5 detik) - close up produk",
  "- Prompt VEO: cinematic close-up, soft lighting",
].join("\n");

test("splitBayuSheet splits setting images from VEO prompts", () => {
  const { settings, veo } = splitBayuSheet(BAYU_SHEET);
  expect(settings.length).toBe(1);
  expect(settings[0]).toMatchObject({
    index: 1,
    title: "Haul Produk",
  });
  expect(settings[0].prompt).toContain("young indonesian man");
  expect(settings[0].prompt).toContain("Rasio: 9:16");
  expect(veo).toContain("Scene 1");
  expect(veo).toContain("cinematic close-up");
  expect(veo).not.toContain("SETTING IMAGE");
});

test("splitBayuSheet tolerates missing blocks", () => {
  const onlyVeo = splitBayuSheet("===PROMPT VEO===\n- Scene 1 (5s)");
  expect(onlyVeo.settings).toEqual([]);
  expect(onlyVeo.veo).toContain("Scene 1");
  const empty = splitBayuSheet("teks acak tanpa blok");
  expect(empty.settings).toEqual([]);
  expect(empty.veo).toBe("");
});
