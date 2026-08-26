import { test, expect } from "bun:test";

import {
  extractAdBriefs,
  extractHtml,
  parseBlocks,
  sanitizeWinAnsi,
  splitEbooks,
  stripMarkdown,
  wrapText,
} from "../convex/lib/ebookPdf";

// ── splitEbooks ─────────────────────────────────────────────────────────────

test("splitEbooks splits on === EBOOK n: judul === markers", () => {
  const output = [
    "===EBOOK 1: Diet Keto Pemula===",
    "# Bab 1",
    "Isi bab satu.",
    "",
    "===EBOOK 2: Meal Prep 7 Hari===",
    "# Bab 1",
    "Isi ebook dua.",
    "",
    "===EBOOK 3: Jurnal Tracking===",
    "Isi ebook tiga.",
  ].join("\n");

  const books = splitEbooks(output);
  expect(books.length).toBe(3);
  expect(books[0].title).toBe("Diet Keto Pemula");
  expect(books[1].title).toBe("Meal Prep 7 Hari");
  expect(books[2].title).toBe("Jurnal Tracking");
  expect(books[0].content).toContain("# Bab 1");
  expect(books[2].content).toContain("Isi ebook tiga.");
});

test("splitEbooks tolerates loose markers and skips empty books", () => {
  const output = [
    "== EBOOK 1 - Panduan Singkat ==",
    "Konten pertama.",
    "===EBOOK 2: Kosong===",
    "===EBOOK 3: Terakhir===",
    "Konten ketiga.",
  ].join("\n");

  const books = splitEbooks(output);
  expect(books.length).toBe(2);
  expect(books[0].title).toBe("Panduan Singkat");
  expect(books[1].title).toBe("Terakhir");
});

test("splitEbooks returns empty array when no marker present", () => {
  expect(splitEbooks("teks biasa tanpa marker")).toEqual([]);
});

// ── extractAdBriefs ─────────────────────────────────────────────────────────

test("extractAdBriefs splits 5 image ad briefs", () => {
  const output = [
    "## Image Ads",
    "===IMAGE AD 1: Flatlay Produk===",
    "Foto flatlay produk dengan latar putih.",
    "===IMAGE AD 2: Before After===",
    "Komposisi before-after.",
    "===IMAGE AD 3: Testimoni===",
    "Mockup testimoni.",
    "===IMAGE AD 4: Promo===",
    "Banner promo diskon.",
    "===IMAGE AD 5: Hero===",
    "Hero shot dramatis.",
  ].join("\n");

  const briefs = extractAdBriefs(output);
  expect(briefs.length).toBe(5);
  expect(briefs[0].title).toBe("Flatlay Produk");
  expect(briefs[4].brief).toContain("Hero shot");
});

test("extractAdBriefs returns empty array without markers", () => {
  expect(extractAdBriefs("tidak ada marker di sini")).toEqual([]);
});

// ── extractHtml ─────────────────────────────────────────────────────────────

test("extractHtml pulls fenced html block with doctype", () => {
  const output = [
    "Konsep visual: modern minimalis.",
    "```html",
    "<!DOCTYPE html>",
    "<html><body><section>Hero</section></body></html>",
    "```",
  ].join("\n");

  const html = extractHtml(output);
  expect(html).toContain("<!DOCTYPE html>");
  expect(html).toContain("<section>Hero</section>");
});

test("extractHtml rejects fenced blocks that are not full documents", () => {
  const output = ["```html", "<div>potongan saja</div>", "```"].join("\n");
  expect(extractHtml(output)).toBeNull();
});

test("extractHtml returns null when no fence exists", () => {
  expect(extractHtml("tanpa blok kode")).toBeNull();
});

// ── parseBlocks ─────────────────────────────────────────────────────────────

test("parseBlocks handles headings, bullets, numbered items, and paragraphs", () => {
  const content = [
    "# Bab 1",
    "Paragraf pertama",
    "berlanjut di baris kedua.",
    "",
    "## Sub-bagian",
    "- Poin bullet satu",
    "* Poin bullet dua",
    "1. Langkah nomor satu",
    "2) Langkah nomor dua",
  ].join("\n");

  const blocks = parseBlocks(content);
  expect(blocks[0]).toEqual({ type: "h1", text: "Bab 1" });
  expect(blocks[1]).toEqual({
    type: "para",
    text: "Paragraf pertama berlanjut di baris kedua.",
  });
  expect(blocks[2]).toEqual({ type: "h2", text: "Sub-bagian" });
  expect(blocks[3]).toEqual({ type: "bullet", text: "Poin bullet satu" });
  expect(blocks[4]).toEqual({ type: "bullet", text: "Poin bullet dua" });
  expect(blocks[5]).toEqual({
    type: "numbered",
    number: 1,
    text: "Langkah nomor satu",
  });
  expect(blocks[6]).toEqual({
    type: "numbered",
    number: 2,
    text: "Langkah nomor dua",
  });
});

// ── wrapText ────────────────────────────────────────────────────────────────

test("wrapText respects max width and keeps single long words intact", () => {
  const measure = (s: string) => s.length;
  expect(wrapText("aku suka makan bakso", 10, measure)).toEqual([
    "aku suka",
    "makan",
    "bakso",
  ]);
  // Single word longer than maxWidth still becomes one line
  expect(wrapText("supercalifragilistic", 5, measure)).toEqual([
    "supercalifragilistic",
  ]);
  expect(wrapText("", 10, measure)).toEqual([]);
});

// ── sanitize / stripMarkdown ────────────────────────────────────────────────

test("sanitizeWinAnsi maps typography and drops emoji", () => {
  expect(sanitizeWinAnsi("\u201Ckutip\u201D \u2014 ok\u2026 \u{1F389}"))
    .toBe('"kutip" - ok... ');
});

test("stripMarkdown removes emphasis markers but keeps text", () => {
  expect(stripMarkdown("**Bold** dan _italic_ `code`")).toBe(
    "Bold dan italic code"
  );
});
