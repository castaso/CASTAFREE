// Pexels stock-photo lookup + landing-page placeholder injection.
//
// Sari's prompt may emit placeholders like <!--PEXELS:keto diet--> in the
// generated HTML. When a Pexels key is configured we replace each placeholder
// with a real <img> from the search results; otherwise they are stripped so
// the page never shows raw markers.

import { pexelsPhotoUrl } from "./providers";

export type PexelsPhoto = {
  url: string;
  alt: string;
  photographer: string;
};

/** Pure helper: extract unique <!--PEXELS:keyword--> queries from HTML (unit-tested). */
export function extractPexelsQueries(html: string): string[] {
  const queries = new Set<string>();
  const re = /<!--\s*PEXELS:([^>]+?)-->/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const q = match[1].trim();
    if (q) queries.add(q);
  }
  return [...queries];
}

/** Pure helper: replace placeholders with img tags (unit-tested). */
export function injectPexelsPhotos(
  html: string,
  photosByQuery: Record<string, PexelsPhoto[]>
): { html: string; injected: number } {
  let injected = 0;
  const out = html.replace(
    /<!--\s*PEXELS:([^>]+?)-->/g,
    (_full, rawQuery: string) => {
      const query = rawQuery.trim();
      const photo = photosByQuery[query]?.[0];
      if (!photo) return "";
      injected += 1;
      const alt = photo.alt || query;
      return `<img src="${photo.url}" alt="${alt.replace(/"/g, "&quot;")}" loading="lazy" style="width:100%;height:auto;border-radius:12px" />`;
    }
  );
  // Also credit photographers at the end when anything was injected.
  const credits = Object.values(photosByQuery)
    .flat()
    .map((p) => `Foto: ${p.photographer} (Pexels)`);
  const suffix =
    injected > 0
      ? `\n<!-- Foto stok oleh ${credits.join(", ")} via Pexels -->`
      : "";
  return { html: out + suffix, injected };
}

export async function searchPhotos(
  apiKey: string,
  query: string,
  perPage = 4
): Promise<PexelsPhoto[]> {
  const res = await fetch(pexelsPhotoUrl(query, perPage), {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = (await res.json()) as {
    photos?: {
      src?: { large?: string; landscape?: string };
      alt?: string;
      photographer?: string;
    }[];
  };
  return (data.photos ?? [])
    .map((p) => ({
      url: p.src?.landscape ?? p.src?.large ?? "",
      alt: p.alt ?? "",
      photographer: p.photographer ?? "Pexels",
    }))
    .filter((p) => p.url.length > 0);
}
