// Unified text-engine layer: multi-provider BYOK with auto-fallback.
//
// Engine order (approved): chosen -> gemini -> groq -> openai(user key)
//   -> openai(server env fallback) -> anthropic.
// Engines without a usable key are skipped. Zero new npm deps: OpenAI and
// Groq share the OpenAI SDK (Groq via baseURL), Gemini and Anthropic are
// plain fetch calls.

export type TextEngine = "gemini" | "groq" | "openai" | "anthropic";

export const ENGINE_DEFAULT_MODELS: Record<TextEngine, string> = {
  // Google's hot-swap alias: always points at the latest stable Flash.
  gemini: "gemini-flash-latest",
  // Groq retired all llama-3.x chat models on 2026-08-16.
  groq: "openai/gpt-oss-120b",
  openai: "gpt-4o-mini",
  anthropic: "claude-haiku-4-5",
};

const PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "gpt-4o-mini": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "gpt-4o": { inputPer1M: 2.5, outputPer1M: 10 },
  "gemini-flash-latest": { inputPer1M: 0, outputPer1M: 0 }, // free tier first
  "openai/gpt-oss-120b": { inputPer1M: 0.15, outputPer1M: 0.6 },
  "claude-haiku-4-5": { inputPer1M: 1, outputPer1M: 5 },
};

export function estimateModelCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const p =
    PRICING[model] ?? { inputPer1M: 0, outputPer1M: 0 };
  return (
    (promptTokens * p.inputPer1M + completionTokens * p.outputPer1M) / 1_000_000
  );
}

/** Mask an API key for display: keep provider-ish prefix + last 4 chars. */
export function maskKey(key: string): string {
  if (key.length <= 8) return "•".repeat(key.length);
  const head = key.slice(0, Math.min(4, key.length - 4));
  return `${head}${"•".repeat(Math.max(6, key.length - head.length - 4))}${key.slice(-4)}`;
}

export type EngineCredential = {
  engine: TextEngine;
  apiKey: string;
  /** true when the credential is the server-wide env fallback */
  fromEnv?: boolean;
};

export type ChainEntry = {
  engine: TextEngine;
  model: string;
  fromEnv: boolean;
};

/**
 * Pure helper: build the ordered fallback chain given the user's chosen
 * engine, available credentials, and whether the server env OpenAI key exists.
 * Unit-tested in tests/providers.test.ts.
 */
export function buildEngineChain(
  chosen: TextEngine,
  credentials: EngineCredential[],
  hasEnvOpenAI: boolean
): ChainEntry[] {
  const byEngine = new Map(credentials.map((c) => [c.engine, c]));
  const chain: ChainEntry[] = [];

  const push = (engine: TextEngine) => {
    if (chain.some((c) => c.engine === engine)) return;
    const cred = byEngine.get(engine);
    if (!cred) return;
    chain.push({
      engine,
      model: ENGINE_DEFAULT_MODELS[engine],
      fromEnv: cred.fromEnv === true,
    });
  };

  push(chosen);
  for (const engine of ["gemini", "groq", "openai", "anthropic"] as const) {
    if (engine !== chosen) push(engine);
  }
  if (
    !chain.some((c) => c.engine === "openai") &&
    hasEnvOpenAI &&
    !byEngine.has("openai")
  ) {
    chain.push({
      engine: "openai",
      model: ENGINE_DEFAULT_MODELS.openai,
      fromEnv: true,
    });
  }
  return chain;
}

// ── Adapters ────────────────────────────────────────────────────────────────

type CallResult = {
  text: string;
  promptTokens: number;
  completionTokens: number;
};

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number
): Promise<CallResult> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("Provider returned an empty response.");
  return {
    text,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number
): Promise<CallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature },
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return {
    text,
    promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
    completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  temperature: number
): Promise<CallResult> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (data.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("Anthropic returned an empty response.");
  return {
    text,
    promptTokens: data.usage?.input_tokens ?? 0,
    completionTokens: data.usage?.output_tokens ?? 0,
  };
}

async function dispatch(
  entry: ChainEntry,
  apiKey: string,
  system: string,
  user: string,
  temperature: number
): Promise<CallResult> {
  switch (entry.engine) {
    case "openai":
      return callOpenAICompatible(
        "https://api.openai.com/v1",
        apiKey,
        entry.model,
        system,
        user,
        temperature
      );
    case "groq":
      return callOpenAICompatible(
        "https://api.groq.com/openai/v1",
        apiKey,
        entry.model,
        system,
        user,
        temperature
      );
    case "gemini":
      return callGemini(apiKey, entry.model, system, user, temperature);
    case "anthropic":
      return callAnthropic(apiKey, entry.model, system, user, temperature);
  }
}

// ── Public entry point ──────────────────────────────────────────────────────

export type TextCallArgs = {
  chosenEngine: TextEngine;
  modelOverride?: string;
  credentials: EngineCredential[];
  hasEnvOpenAI: boolean;
  system: string;
  user: string;
  temperature?: number;
};

export type TextCallResult = {
  ok: boolean;
  text: string;
  engine?: TextEngine;
  model?: string;
  fromEnv?: boolean;
  promptTokens: number;
  completionTokens: number;
  error?: string;
  triedEngines: TextEngine[];
};

/**
 * Try each engine in fallback order until one succeeds. Never throws —
 * callers get a structured result and decide how to surface failures.
 */
export async function callText(args: TextCallArgs): Promise<TextCallResult> {
  const chain = buildEngineChain(
    args.chosenEngine,
    args.credentials,
    args.hasEnvOpenAI
  ).map((entry, i) =>
    i === 0 && args.modelOverride
      ? { ...entry, model: args.modelOverride }
      : entry
  );

  const tried: TextEngine[] = [];
  let lastError = "Gak ada API key yang tersedia. Isi minimal satu di Settings.";
  for (const entry of chain) {
    const cred = args.credentials.find((c) => c.engine === entry.engine);
    if (!cred) continue;
    tried.push(entry.engine);
    try {
      const result = await dispatch(
        entry,
        cred.apiKey,
        args.system,
        args.user,
        args.temperature ?? 0.7
      );
      return {
        ok: true,
        text: result.text,
        engine: entry.engine,
        model: entry.model,
        fromEnv: entry.fromEnv,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        triedEngines: tried,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  return {
    ok: false,
    text: "",
    promptTokens: 0,
    completionTokens: 0,
    error: lastError,
    triedEngines: tried,
  };
}
