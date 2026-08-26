// Optional Supabase Storage upload for public hosting of final artifacts.
//
// Requires the user's Project URL + service_role key (saved in providerKeys
// with meta.projectUrl). Uploads are best-effort: failures never break a run.

export const DEFAULT_BUCKET = "castafree";

/** Pure helper: keep bucket names URL-safe (unit-tested). */
export function sanitizeBucketName(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return cleaned || DEFAULT_BUCKET;
}

export async function uploadPublic(opts: {
  projectUrl: string;
  serviceKey: string;
  bucket?: string;
  path: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<string> {
  const bucket = opts.bucket?.trim() || DEFAULT_BUCKET;
  const cleanPath = opts.path.replace(/^\/+/, "");
  const res = await fetch(
    `${opts.projectUrl}/storage/v1/object/${bucket}/${cleanPath}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.serviceKey}`,
        "Content-Type": opts.mimeType,
        "x-upsert": "true",
      },
      body: new Blob([opts.bytes], { type: opts.mimeType }),
    }
  );
  if (!res.ok) {
    throw new Error(`Supabase upload gagal: HTTP ${res.status}`);
  }
  return `${opts.projectUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}
