// Scrape Creators — optional competitor-ad research for Agent 01 (Maya).
//
// ASSUMPTION: base URL + x-api-key auth per lib/providers.ts; the exact
// response shape is parsed defensively. Every failure is soft: callers
// proceed without competitor context (riset tetap jalan).

import { SCRAPE_CREATORS_BASE } from "./providers";

export type CompetitorAd = {
  pageName: string;
  bodyText: string;
  cta?: string;
};

/** Pure helper: defensively map an unknown payload to ads (unit-tested). */
export function parseCompetitorAds(payload: unknown, limit = 5): CompetitorAd[] {
  const container = payload as { data?: unknown; results?: unknown; ads?: unknown };
  const list =
    (Array.isArray(container?.data) && container.data) ||
    (Array.isArray(container?.results) && container.results) ||
    (Array.isArray(container?.ads) && container.ads) ||
    [];
  if (!Array.isArray(list)) return [];
  return (list as Record<string, unknown>[])
    .slice(0, limit)
    .map((ad) => {
      const page = ad.page_name ?? ad.pageName ?? ad.author ?? "";
      const snapshot = (ad.snapshot ?? {}) as Record<string, unknown>;
      const body =
        ad.body ??
        ad.ad_creative_body ??
        snapshot.body ??
        (Array.isArray(snapshot.body)
          ? (snapshot.body[0] as { text?: string })?.text
          : undefined) ??
        "";
      const cta =
        ad.cta ??
        ((snapshot.call_to_action as { value?: unknown } | undefined)?.value) ??
        undefined;
      return {
        pageName: typeof page === "string" ? page.slice(0, 80) : "",
        bodyText: typeof body === "string" ? body.slice(0, 300) : "",
        cta: typeof cta === "string" ? cta.slice(0, 40) : undefined,
      };
    })
    .filter((ad) => ad.bodyText.length > 0);
}

/**
 * Fetch a compact competitor-ad context block for a topic.
 * Returns null when unavailable (no key / request failed / no ads).
 */
export async function fetchCompetitorContext(
  apiKey: string | null,
  topic: string
): Promise<string | null> {
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `${SCRAPE_CREATORS_BASE}?keyword=${encodeURIComponent(topic)}&country=ID`,
      { headers: { "x-api-key": apiKey } }
    );
    if (!res.ok) return null;
    const ads = parseCompetitorAds(await res.json());
    if (ads.length === 0) return null;
    const lines = ads.map(
      (ad, i) =>
        `${i + 1}. ${ad.pageName || "(unknown page)"}: "${ad.bodyText}"${ad.cta ? ` [CTA: ${ad.cta}]` : ""}`
    );
    return [
      "## Riset Kompetitor (Scrape Creators — Meta Ads Library)",
      ...lines,
      "",
    ].join("\n");
  } catch {
    return null;
  }
}
