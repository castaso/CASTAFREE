// Reza (Agent 02) output parsers: UGC script sections with paired Meta
// caption triplets (primary text / headline / description).

export type MetaCaption = {
  primaryText: string;
  headline: string;
  description: string;
};

export type UgcScript = {
  index: number;
  title: string;
  script: string;
  caption: MetaCaption | null;
};

const UGC_MARKER = /^\s*={2,}\s*UGC\s*(\d+)\s*[:\-–—]?\s*(.+?)\s*={2,}\s*$/i;

/**
 * Parse a "Caption Meta:" block inside a section (unit-tested).
 * Tolerates missing fields and Indonesian aliases.
 */
export function parseCaptionBlock(text: string): MetaCaption | null {
  const primary =
    /(?:primary\s*text|teks\s*utama)\s*:\s*([\s\S]*?)(?=\n\s*(?:headline|judul)\s*:|\n\s*description\s*:|\ndeskripsi\s*:|$)/i.exec(
      text
    )?.[1] ?? "";
  const headline =
    /(?:headline|judul\s*iklan)\s*:\s*([\s\S]*?)(?=\n\s*(?:description|deskripsi)\s*:|$)/i.exec(
      text
    )?.[1] ?? "";
  const description =
    /(?:description|deskripsi)\s*:\s*([\s\S]*?)$/i.exec(text)?.[1] ?? "";

  const cleaned = {
    primaryText: primary.trim(),
    headline: headline.trim(),
    description: description.trim(),
  };
  if (!cleaned.primaryText && !cleaned.headline && !cleaned.description) {
    return null;
  }
  return cleaned;
}

/** Pure helper: split Reza's output into UGC script sections (unit-tested). */
export function splitUgcScripts(output: string): UgcScript[] {
  const scripts: UgcScript[] = [];
  let current: { index: number; title: string; body: string } | null = null;

  for (const line of output.split(/\r?\n/)) {
    const match = UGC_MARKER.exec(line);
    if (match) {
      if (current) scripts.push(finalizeUgc(current));
      current = {
        index: parseInt(match[1], 10),
        title: match[2].trim(),
        body: "",
      };
    } else if (current) {
      current.body += `${line}\n`;
    }
  }
  if (current) scripts.push(finalizeUgc(current));
  return scripts.filter((s) => s.script.length > 0);
}

function finalizeUgc(section: {
  index: number;
  title: string;
  body: string;
}): UgcScript {
  const captionMatch =
    /Caption\s*Meta\s*:?\s*\n([\s\S]*)$/i.exec(section.body);
  const caption = captionMatch
    ? parseCaptionBlock(captionMatch[1])
    : null;
  const script = (
    captionMatch ? section.body.slice(0, captionMatch.index) : section.body
  )
    .trim();
  return {
    index: section.index,
    title: section.title,
    script,
    caption,
  };
}

// ── Bayu (Agent 05) sheet parsing ───────────────────────────────────────────

export type SettingImageSection = {
  index: number;
  title: string;
  prompt: string;
};

const SETTING_IMAGE_MARKER =
  /^\s*={2,}\s*SETTING\s*IMAGE\s*(\d+)\s*[:\-–—]?\s*(.+?)\s*={2,}\s*$/i;

/** Pure helper: extract ===SETTING IMAGE n=== sections from a block (unit-tested). */
export function parseSettingSections(block: string): SettingImageSection[] {
  const sections: SettingImageSection[] = [];
  let current: SettingImageSection | null = null;
  for (const line of block.split(/\r?\n/)) {
    const match = SETTING_IMAGE_MARKER.exec(line);
    if (match) {
      if (current) sections.push(current);
      current = {
        index: parseInt(match[1], 10),
        title: match[2].trim(),
        prompt: "",
      };
    } else if (current) {
      current.prompt += `${line}\n`;
    }
  }
  if (current) sections.push(current);
  return sections
    .map((s) => ({ ...s, prompt: s.prompt.trim() }))
    .filter((s) => s.prompt.length > 0);
}

/**
 * Pure helper: split Bayu's combined sheet into the setting-images block
 * and the VEO prompts block (unit-tested).
 */
export function splitBayuSheet(
  output: string
): { settings: SettingImageSection[]; veo: string } {
  const settingsMatch =
    /=+\s*SETTING\s*IMAGES\s*=+\s*\n?([\s\S]*?)(?==+\s*PROMPT\s*VEO\s*=+|$)/i.exec(
      output
    );
  const veoMatch = /=+\s*PROMPT\s*VEO\s*=+\s*\n?([\s\S]*)$/i.exec(output);
  return {
    settings: settingsMatch ? parseSettingSections(settingsMatch[1]) : [],
    veo: veoMatch?.[1]?.trim() ?? "",
  };
}
