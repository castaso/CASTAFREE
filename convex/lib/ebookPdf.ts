import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

// ── Pure helpers (unit-tested in tests/ebookPdf.test.ts) ───────────────────

export type Ebook = { title: string; content: string };

export type Block =
  | { type: "h1" | "h2" | "h3" | "para"; text: string }
  | { type: "bullet"; text: string }
  | { type: "numbered"; text: string; number: number };

const EBOOK_MARKER = /^\s*={2,}\s*EBOOK\s*\d*\s*[:\-–—]?\s*(.+?)\s*={2,}\s*$/i;

const AD_BRIEF_MARKER = /^\s*={2,}\s*IMAGE\s*AD\s*\d*\s*[:\-–—]?\s*(.+?)\s*={2,}\s*$/i;

export function extractAdBriefs(output: string): { title: string; brief: string }[] {
  const briefs: { title: string; brief: string }[] = [];
  let current: { title: string; brief: string } | null = null;
  for (const line of output.split(/\r?\n/)) {
    const match = AD_BRIEF_MARKER.exec(line);
    if (match) {
      if (current) briefs.push(current);
      current = { title: match[1].trim(), brief: "" };
    } else if (current) {
      current.brief += `${line}\n`;
    }
  }
  if (current) briefs.push(current);
  return briefs
    .map((b) => ({ ...b, brief: b.brief.trim() }))
    .filter((b) => b.brief.length > 0);
}

export function extractHtml(output: string): string | null {
  const fenced = /```(?:html)?\s*\n([\s\S]*?)```/.exec(output);
  const html = fenced?.[1]?.trim();
  if (html && /<!doctype html|<html[\s>]/i.test(html)) return html;
  return null;
}

export function splitEbooks(output: string): Ebook[] {
  const books: Ebook[] = [];
  let current: Ebook | null = null;
  for (const line of output.split(/\r?\n/)) {
    const match = EBOOK_MARKER.exec(line);
    if (match) {
      if (current) books.push(current);
      current = { title: match[1].trim(), content: "" };
    } else if (current) {
      current.content += `${line}\n`;
    }
  }
  if (current) books.push(current);
  return books
    .map((b) => ({ ...b, content: b.content.trim() }))
    .filter((b) => b.content.length > 0);
}

const WINANSI_MAP: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201A": ",",
  "\u201C": '"',
  "\u201D": '"',
  "\u201E": '"',
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
  "\u00A0": " ",
  "\u2022": "-",
  "\u2192": "->",
  "\u2260": "!=",
  "\u2265": ">=",
  "\u2264": "<=",
};

/** Strip markdown emphasis markers from inline text. */
export function stripMarkdown(text: string): string {
  return text.replace(/\*\*|__|[*_`]/g, "");
}

/** Make text safe for pdf-lib standard fonts (WinAnsi / Latin-1). */
export function sanitizeWinAnsi(text: string): string {
  let out = "";
  for (const ch of stripMarkdown(text)) {
    const mapped = WINANSI_MAP[ch];
    if (mapped !== undefined) {
      out += mapped;
    } else if (ch.charCodeAt(0) <= 0xff) {
      out += ch;
    }
    // Chars above U+00FF (emoji etc.) are dropped silently.
  }
  return out;
}

/** Greedy word-wrap using an injectable measuring function. */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  let paraBuffer: string[] = [];

  const flush = () => {
    if (paraBuffer.length > 0) {
      blocks.push({ type: "para", text: paraBuffer.join(" ") });
      paraBuffer = [];
    }
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = Math.min(heading[1].length, 3);
      blocks.push({
        type: `h${level}` as "h1" | "h2" | "h3",
        text: heading[2],
      });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    if (bullet) {
      flush();
      blocks.push({ type: "bullet", text: bullet[1] });
      continue;
    }
    const numbered = /^(\d{1,2})[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      flush();
      blocks.push({
        type: "numbered",
        text: numbered[2],
        number: parseInt(numbered[1], 10),
      });
      continue;
    }
    paraBuffer.push(line);
  }
  flush();
  return blocks;
}

// ── PDF rendering (pdf-lib, standard fonts only) ───────────────────────────

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 64;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.12, 0.12, 0.15);
const BRAND = rgb(0.19, 0.19, 0.53); // #303188
const ACCENT = rgb(0.98, 0.65, 0.1); // #FAA61A

type DrawState = {
  pdf: PDFDocument;
  page: PDFPage;
  y: number;
};

function ensureSpace(state: DrawState, needed: number) {
  if (state.y - needed < MARGIN + 28) {
    state.page = state.pdf.addPage([PAGE_W, PAGE_H]);
    state.y = PAGE_H - MARGIN;
  }
}

function drawWrapped(
  state: DrawState,
  rawText: string,
  opts: {
    font: PDFFont;
    size: number;
    lineHeight: number;
    x?: number;
    width?: number;
    color?: ReturnType<typeof rgb>;
    gapAfter: number;
  }
) {
  const text = sanitizeWinAnsi(rawText);
  if (!text) return;
  const width = opts.width ?? CONTENT_W;
  const x = opts.x ?? MARGIN;
  const lines = wrapText(text, width, (s) =>
    opts.font.widthOfTextAtSize(s, opts.size)
  );
  for (const line of lines) {
    ensureSpace(state, opts.lineHeight);
    state.page.drawText(line, {
      x,
      y: state.y - opts.size,
      size: opts.size,
      font: opts.font,
      color: opts.color ?? INK,
    });
    state.y -= opts.lineHeight;
  }
  state.y -= opts.gapAfter;
}

export async function renderEbookPdf(ebook: Ebook): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(sanitizeWinAnsi(ebook.title) || "Ebook CASTAFREE");
  pdf.setAuthor("CASTAFREE");

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // ── Cover page ──
  const cover = pdf.addPage([PAGE_W, PAGE_H]);

  cover.drawText("CASTAFREE", {
    x: MARGIN,
    y: PAGE_H - MARGIN,
    size: 13,
    font: bold,
    color: BRAND,
  });
  cover.drawRectangle({
    x: MARGIN,
    y: PAGE_H - MARGIN - 26,
    width: 48,
    height: 3,
    color: ACCENT,
  });

  const titleLines = wrapText(
    sanitizeWinAnsi(ebook.title),
    CONTENT_W,
    (s) => bold.widthOfTextAtSize(s, 30)
  );
  let titleY = PAGE_H / 2 + (titleLines.length * 38) / 2;
  for (const line of titleLines) {
    cover.drawText(line, {
      x: (PAGE_W - bold.widthOfTextAtSize(line, 30)) / 2,
      y: titleY,
      size: 30,
      font: bold,
      color: INK,
    });
    titleY -= 38;
  }

  const byline = "Dibuat oleh Dimas · Product Builder CASTAFREE";
  cover.drawText(byline, {
    x: (PAGE_W - font.widthOfTextAtSize(byline, 11)) / 2,
    y: titleY - 14,
    size: 11,
    font,
    color: rgb(0.45, 0.45, 0.5),
  });

  cover.drawText("castafree.id", {
    x: (PAGE_W - font.widthOfTextAtSize("castafree.id", 10)) / 2,
    y: MARGIN,
    size: 10,
    font,
    color: rgb(0.55, 0.55, 0.6),
  });

  // ── Body ──
  const state: DrawState = {
    pdf,
    page: pdf.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
  };

  let firstH1 = true;
  for (const block of parseBlocks(ebook.content)) {
    switch (block.type) {
      case "h1": {
        if (!firstH1) {
          state.page = pdf.addPage([PAGE_W, PAGE_H]);
          state.y = PAGE_H - MARGIN;
        }
        firstH1 = false;
        drawWrapped(state, block.text, {
          font: bold,
          size: 20,
          lineHeight: 26,
          color: BRAND,
          gapAfter: 10,
        });
        break;
      }
      case "h2":
        drawWrapped(state, block.text, {
          font: bold,
          size: 15,
          lineHeight: 21,
          gapAfter: 6,
        });
        break;
      case "h3":
        drawWrapped(state, block.text, {
          font: bold,
          size: 12.5,
          lineHeight: 18,
          gapAfter: 4,
        });
        break;
      case "bullet": {
        ensureSpace(state, 16);
        state.page.drawCircle({
          x: MARGIN + 4,
          y: state.y - 8,
          size: 1.8,
          color: ACCENT,
        });
        drawWrapped(state, block.text, {
          font,
          size: 11,
          lineHeight: 16,
          x: MARGIN + 16,
          width: CONTENT_W - 16,
          gapAfter: 2,
        });
        break;
      }
      case "numbered": {
        ensureSpace(state, 16);
        const label = `${block.number}.`;
        state.page.drawText(label, {
          x: MARGIN + 2,
          y: state.y - 11,
          size: 11,
          font,
          color: BRAND,
        });
        drawWrapped(state, block.text, {
          font,
          size: 11,
          lineHeight: 16,
          x: MARGIN + 20,
          width: CONTENT_W - 20,
          gapAfter: 2,
        });
        break;
      }
      default:
        drawWrapped(state, block.text, {
          font,
          size: 11,
          lineHeight: 17,
          gapAfter: 8,
        });
    }
  }

  // ── Page numbers ──
  const pages = pdf.getPages();
  pages.forEach((page, i) => {
    if (i === 0) return;
    const label = `${i + 1}`;
    page.drawText(label, {
      x: (PAGE_W - font.widthOfTextAtSize(label, 9)) / 2,
      y: MARGIN / 2,
      size: 9,
      font,
      color: rgb(0.55, 0.55, 0.6),
    });
  });

  return pdf.save();
}
