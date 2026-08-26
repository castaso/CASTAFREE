// Image & video generation with KIE-first routing and OpenAI fallback.
//
// KIE endpoints verified against docs.kie.ai:
//   POST /api/v1/veo/generate            -> { data: { taskId } }
//   GET  /api/v1/veo/record-info?taskId= -> { data: { successFlag, resultUrls } }
//   POST /api/v1/jobs/createTask         -> { data: { taskId } }
//   GET  /api/v1/jobs/recordInfo?taskId= -> { data: { status, response: { resultJson } } }

import {
  KIE_IMAGE_MODEL,
  KIE_JOBS_CREATE,
  KIE_JOBS_RECORD,
  KIE_VIDEO_MODEL,
  KIE_VEO_GENERATE,
  KIE_VEO_RECORD,
} from "./providers";

const KIE_POLL_INTERVAL_MS = 10_000;

export type MediaResult = {
  ok: boolean;
  bytes?: Uint8Array;
  mime?: string;
  source?: "kie" | "openai";
  error?: string;
};

async function fetchBytes(url: string): Promise<{ bytes: Uint8Array; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gagal download hasil media: HTTP ${res.status}`);
  return {
    bytes: new Uint8Array(await res.arrayBuffer()),
    mime: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** Pure helper: interpret a KIE Veo successFlag (unit-tested). */
export function veoStatusToState(
  flag: number | undefined
): "pending" | "done" | "failed" {
  if (flag === 1) return "done";
  if (flag === 2 || flag === 3) return "failed";
  return "pending";
}

/** Pure helper: pull the first result URL out of a KIE record payload (unit-tested). */
export function extractKieResultUrl(record: unknown): string | null {
  const data = record as {
    data?: {
      resultUrls?: string;
      response?: { resultJson?: string };
    };
  };
  const raw = data?.data?.resultUrls ?? data?.data?.response?.resultJson;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string") return parsed;
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed[0] as string;
    }
  } catch {
    if (raw.startsWith("http")) return raw;
  }
  return null;
}

type KieRecord = {
  code?: number;
  data?: {
    taskId?: string;
    successFlag?: number;
    status?: string;
    response?: { resultJson?: string };
    resultUrls?: string;
    failMsg?: string;
  };
};

async function kieFetchJson(
  key: string,
  url: string,
  init?: RequestInit
): Promise<KieRecord> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 200) {
    throw new Error(`KIE HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as KieRecord;
  if (json.code !== undefined && json.code !== 200) {
    throw new Error(`KIE error: ${json.data?.failMsg ?? `code ${json.code}`}`);
  }
  return json;
}

async function pollUntil(
  deadlineMs: number,
  intervalMs: number,
  check: () => Promise<"pending" | "done" | "failed">
): Promise<"done" | "failed"> {
  while (Date.now() < deadlineMs) {
    const state = await check();
    if (state !== "pending") return state;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error("Timeout nunggu hasil dari KIE — coba lagi nanti.");
}

// ── Images ──────────────────────────────────────────────────────────────────

/**
 * Generate an ad image. Routes through KIE when a key is provided,
 * otherwise falls back to OpenAI gpt-image-1.
 */
export async function generateImageBytes(opts: {
  kieKey?: string;
  openaiApiKey?: string;
  prompt: string;
  timeoutMs?: number;
}): Promise<MediaResult> {
  if (opts.kieKey) {
    try {
      const bytes = await generateImageViaKie(
        opts.kieKey,
        opts.prompt,
        opts.timeoutMs ?? 180_000
      );
      return { ok: true, ...bytes, source: "kie" };
    } catch (err) {
      // fall through to OpenAI; surface KIE error only if OpenAI also fails
      if (!opts.openaiApiKey) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
  }
  if (opts.openaiApiKey) {
    try {
      const bytes = await generateImageViaOpenAI(opts.openaiApiKey, opts.prompt);
      return { ok: true, ...bytes, source: "openai" };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  return { ok: false, error: "Gak ada KIE atau OpenAI key buat generate gambar." };
}

async function generateImageViaKie(
  key: string,
  prompt: string,
  timeoutMs: number
): Promise<{ bytes: Uint8Array; mime: string }> {
  const created = await kieFetchJson(key, KIE_JOBS_CREATE, {
    method: "POST",
    body: JSON.stringify({
      model: KIE_IMAGE_MODEL,
      input: { prompt },
    }),
  });
  const taskId = created.data?.taskId;
  if (!taskId) throw new Error("KIE gak ngembaliin taskId.");

  const state = await pollUntil(Date.now() + timeoutMs, KIE_POLL_INTERVAL_MS, async () => {
    const record = await kieFetchJson(
      key,
      `${KIE_JOBS_RECORD}?taskId=${encodeURIComponent(taskId)}`
    );
    const status = record.data?.status;
    if (status === "completed" || status === "success") return "done";
    if (status === "failed" || status === "error") return "failed";
    return "pending";
  });
  if (state === "failed") throw new Error("KIE gagal generate gambar.");

  // Fetch the final record again for the URL.
  const record = await kieFetchJson(
    key,
    `${KIE_JOBS_RECORD}?taskId=${encodeURIComponent(taskId)}`
  );
  const url = extractKieResultUrl(record);
  if (!url) throw new Error("KIE gak ngembaliin URL gambar.");
  return fetchBytes(url);
}

async function generateImageViaOpenAI(
  apiKey: string,
  prompt: string
): Promise<{ bytes: Uint8Array; mime: string }> {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey });
  const res = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
    output_format: "png",
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI tidak mengembalikan data gambar.");
  return {
    bytes: new Uint8Array(Buffer.from(b64, "base64")),
    mime: "image/png",
  };
}

// ── Video (Veo via KIE) ─────────────────────────────────────────────────────

export async function generateVeoVideo(opts: {
  kieKey: string;
  prompt: string;
  aspectRatio?: "16:9" | "9:16";
  timeoutMs?: number;
}): Promise<MediaResult> {
  try {
    const created = await kieFetchJson(opts.kieKey, KIE_VEO_GENERATE, {
      method: "POST",
      body: JSON.stringify({
        prompt: opts.prompt,
        model: KIE_VIDEO_MODEL,
        aspect_ratio: opts.aspectRatio ?? "16:9",
        generationType: "TEXT_2_VIDEO",
      }),
    });
    const taskId = created.data?.taskId;
    if (!taskId) throw new Error("KIE gak ngembaliin taskId video.");

    let finalRecord: KieRecord | null = null;
    const state = await pollUntil(
      Date.now() + (opts.timeoutMs ?? 210_000),
      KIE_POLL_INTERVAL_MS,
      async () => {
        finalRecord = await kieFetchJson(
          opts.kieKey,
          `${KIE_VEO_RECORD}?taskId=${encodeURIComponent(taskId)}`
        );
        return veoStatusToState(finalRecord.data?.successFlag);
      }
    );
    if (state === "failed") {
      throw new Error(
        `Veo gagal: ${(finalRecord as KieRecord | null)?.data?.failMsg ?? "unknown"}`
      );
    }
    const url = extractKieResultUrl(finalRecord);
    if (!url) throw new Error("KIE gak ngembaliin URL video.");
    const file = await fetchBytes(url);
    return { ok: true, ...file, source: "kie", mime: "video/mp4" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
