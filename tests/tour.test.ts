import { test, expect } from "bun:test";

import {
  conceptLetter,
  parseConcepts,
  slugify,
  splitBriefAndBvi,
} from "../convex/researchAI";
import { normalizeAgentIds } from "../convex/pipelineAI";

// ── parseConcepts (doc 07: A-E + USP/Avatar) ────────────────────────────────

const SAMPLE_OUTPUT = [
  "Riset pasar menunjukkan tren positif untuk topik ini.",
  "",
  "===KONSEP A: Ebook Diet Keto Pemula===",
  "One-liner: Panduan keto 30 hari tanpa ribet",
  "Angle: Mulai keto tanpa confused",
  "Target: Pemula kesehatan usia 25-40",
  "Avatar: Ibu muda sibuk yang mau turun berat badan tapi bingung mulai dari mana",
  "USP: Satu-satunya panduan keto dengan meal plan lokal Indonesia",
  "Format: ebook PDF",
  "Harga: Rp 99.000",
  "",
  "===KONSEP B: Template Meal Prep===",
  "Angle: Hemat waktu masak mingguan",
  "Target: pekerja sibuk",
].join("\n");

test("parseConcepts extracts structured fields incl. USP and avatar", () => {
  const concepts = parseConcepts(SAMPLE_OUTPUT);
  expect(concepts.length).toBe(2);
  expect(concepts[0]).toMatchObject({
    title: "Ebook Diet Keto Pemula",
    angle: "Mulai keto tanpa confused",
    targetAudience: "Pemula kesehatan usia 25-40",
    avatar: "Ibu muda sibuk yang mau turun berat badan tapi bingung mulai dari mana",
    usp: "Satu-satunya panduan keto dengan meal plan lokal Indonesia",
    price: "Rp 99.000",
  });
});

test("conceptLetter maps 1-5 to A-E", () => {
  expect(conceptLetter(1)).toBe("A");
  expect(conceptLetter(5)).toBe("E");
  expect(conceptLetter(0)).toBe("A"); // clamped
});

// ── splitBriefAndBvi ────────────────────────────────────────────────────────

test("splitBriefAndBvi splits the two delimited docs", () => {
  const output = [
    "===PRODUCT_BRIEF===",
    "# Positioning",
    "Produk untuk pemula.",
    "===BVI===",
    "- Warna: #303188",
    "- Font: Inter",
  ].join("\n");
  const { brief, bvi } = splitBriefAndBvi(output);
  expect(brief).toContain("# Positioning");
  expect(brief).not.toContain("Warna");
  expect(bvi).toContain("#303188");
  expect(bvi).toContain("Font: Inter");
});

// ── parseConcepts (numeric markers, legacy format) ─────────────────────────

const NUMERIC_OUTPUT = [
  "Riset pasar menunjukkan tren positif untuk topik ini.",
  "",
  "===KONSEP 1: Ebook Diet Keto Pemula===",
  "Angle: Panduan 30 hari tanpa ribet",
  "Target: Pemula kesehatan usia 25-40",
  "Format: ebook PDF",
  "Harga: Rp 99.000",
  "Alasan: Kompetitor minim konten terstruktur",
  "",
  "===KONSEP 2: Template Meal Prep===",
  "Angle: Hemat waktu masak mingguan",
  "Target: pekerja sibuk",
  "Format: template Notion",
  "Harga: Rp 49.000",
].join("\n");

test("parseConcepts extracts structured fields from Maya output", () => {
  const concepts = parseConcepts(NUMERIC_OUTPUT);
  expect(concepts.length).toBe(2);
  expect(concepts[0]).toMatchObject({
    index: 1,
    title: "Ebook Diet Keto Pemula",
    angle: "Panduan 30 hari tanpa ribet",
    targetAudience: "Pemula kesehatan usia 25-40",
    format: "ebook PDF",
    price: "Rp 99.000",
  });
  expect(concepts[0].rawText).toContain("Kompetitor minim");
  expect(concepts[1].title).toBe("Template Meal Prep");
});

test("parseConcepts tolerates missing optional fields", () => {
  const concepts = parseConcepts("===KONSEP 3: Judul Saja===\nIsi bebas.");
  expect(concepts.length).toBe(1);
  expect(concepts[0].title).toBe("Judul Saja");
  expect(concepts[0].angle).toBe("");
});

test("parseConcepts returns empty array without markers", () => {
  expect(parseConcepts("teks riset biasa tanpa konsep")).toEqual([]);
});

// ── slugify ─────────────────────────────────────────────────────────────────

test("slugify produces URL-safe slugs like ProductsPage", () => {
  expect(slugify("Ebook Diet Keto Pemula!")).toBe("ebook-diet-keto-pemula");
  expect(slugify("  --Kursus__Desain!!--")).toBe("kursus-desain");
});

// ── normalizeAgentIds ───────────────────────────────────────────────────────

test("normalizeAgentIds defaults to full pipeline order", () => {
  expect(normalizeAgentIds(undefined)).toEqual([
    "maya",
    "reza",
    "dimas",
    "sari",
    "bayu",
  ]);
  expect(normalizeAgentIds([])).toEqual([
    "maya",
    "reza",
    "dimas",
    "sari",
    "bayu",
  ]);
});

test("normalizeAgentIds filters unknown ids and preserves canonical order", () => {
  expect(normalizeAgentIds(["bayu", "hacker", "maya"])).toEqual([
    "maya",
    "bayu",
  ]);
  expect(normalizeAgentIds(["dimas"])).toEqual(["dimas"]);
});
