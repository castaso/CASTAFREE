import { test, expect } from "bun:test";

import {
  parseConcepts,
  slugify,
} from "../convex/researchAI";
import { normalizeAgentIds } from "../convex/pipelineAI";

// ── parseConcepts ───────────────────────────────────────────────────────────

const SAMPLE_OUTPUT = [
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
  const concepts = parseConcepts(SAMPLE_OUTPUT);
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
