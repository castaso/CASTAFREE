// Optional Supabase Storage upload for public hosting of final artifacts.
//
// Requires the user's Project URL + service_role key (saved in providerKeys
// with meta.projectUrl). Uploads are best-effort: failures never break a run.

export async function uploadPublic(opts: {
  projectUrl: string;
  serviceKey: string;
  bucket?: string;
  path: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<string> {
  const bucket = opts.bucket ?? "castafree";
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
