// Shared external-provider endpoints and defaults.

export const KIE_BASE = "https://api.kie.ai";
export const KIE_VEO_GENERATE = `${KIE_BASE}/api/v1/veo/generate`;
export const KIE_VEO_RECORD = `${KIE_BASE}/api/v1/veo/record-info`;
export const KIE_JOBS_CREATE = `${KIE_BASE}/api/v1/jobs/createTask`;
export const KIE_JOBS_RECORD = `${KIE_BASE}/api/v1/jobs/recordInfo`;

/** KIE image model used for ad-image generation (unified jobs API). */
export const KIE_IMAGE_MODEL = "nano-banana";
/** KIE video model: cost-efficient Veo variant. */
export const KIE_VIDEO_MODEL = "veo3_fast";

export const PEXELS_BASE = "https://api.pexels.com/v1";

/**
 * Scrape Creators base + competitor-ad search path.
 * ASSUMPTION: x-api-key auth; endpoint verified at implementation time —
 * all calls soft-fail so riset tetap jalan tanpa ini.
 */
export const SCRAPE_CREATORS_BASE =
  "https://api.scrapecreators.com/v1/meta/adlibrary/search";

export function pexelsPhotoUrl(query: string, perPage = 6): string {
  return `${PEXELS_BASE}/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
}
