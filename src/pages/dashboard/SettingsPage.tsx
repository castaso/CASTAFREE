import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import {
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  Image,
  KeyRound,
  Loader2,
  LogOut,
  Plug,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { AGENTS } from "@/data/team";

// ── Static provider metadata (doc 04/13) ────────────────────────────────────

import {
  ENGINE_MODEL_OPTIONS,
  TEXT_ENGINES,
} from "../../../convex/lib/llm";

type TextEngineId = (typeof TEXT_ENGINES)[number];

const ENGINES: {
  id: TextEngineId;
  name: string;
  badge: string;
  note: string;
}[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "GRATIS",
    note: "Engine utama — free tier ±1.500 req/hari, tanpa kartu kredit. Key: aistudio.google.com/app/apikey",
  },
  {
    id: "groq",
    name: "Groq",
    badge: "GRATIS",
    note: "Cadangan cepat (GPT-OSS) ±1.000 req/hari. Key: console.groq.com/keys",
  },
  {
    id: "kimi",
    name: "Kimi (Moonshot)",
    badge: "OPSIONAL",
    note: "Opsi hemat, OpenAI-compatible. Key dari platform Moonshot (kimi.com).",
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "OPSIONAL",
    note: "Pay-as-you-go. Tanpa key sendiri, server key tetap jadi cadangan terakhir.",
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    badge: "PREMIUM",
    note: "Kualitas copy bahasa Indonesia terbaik — Sonnet seimbang, Haiku hemat buat tugas ringan.",
  },
];

const OPTIONAL_PROVIDERS: {
  id: "kie" | "pexels" | "scrape_creators" | "supabase";
  name: string;
  note: string;
  needsProjectUrl?: boolean;
}[] = [
  {
    id: "kie",
    name: "KIE — auto gambar & video",
    note: "Auto-generate image ad & video Veo langsung dari pipeline. Tanpa ini, prompt VEO tetap dibuat sebagai sheet.",
  },
  {
    id: "pexels",
    name: "Pexels — foto Landing Page",
    note: "Foto stok buat section landing page. Free tier cukup — pexels.com/api.",
  },
  {
    id: "scrape_creators",
    name: "Scrape Creators — riset kompetitor",
    note: "Scrape iklan kompetitor (Meta Ads Library) buat riset Maya. Tanpa ini riset tetap jalan pakai engine AI.",
  },
  {
    id: "supabase",
    name: "Supabase — storage gambar publik",
    note: "Hosting publik file akhir (gambar/PDF/LP). Isi Project URL + service_role key.",
    needsProjectUrl: true,
  },
];

const MODEL_OPTIONS: Record<string, { id: string; label: string }[]> =
  ENGINE_MODEL_OPTIONS;

type ProviderStatus = {
  provider: string;
  maskedKey: string;
  projectUrl?: string;
  bucket?: string;
  status: "unverified" | "ok" | "error";
  lastError?: string;
};

export function SettingsPage() {
  const { signOut } = useAuthActions();
  const licenses = useQuery(api.licenses.myLicenses);
  const settings = useQuery(api.userSettings.getSettings);
  const statuses = useQuery(api.providerKeys.listStatuses);
  const setModel = useMutation(api.userSettings.setModel);
  const setTextEngine = useMutation(api.userSettings.setTextEngine);
  const overrides = useQuery(api.userSettings.listAgentOverrides);
  const setAgentOverride = useMutation(api.userSettings.setAgentOverride);
  const saveKey = useMutation(api.providerKeys.saveKey);
  const deleteKey = useMutation(api.providerKeys.deleteKey);
  const testConnection = useAction(api.providerKeys.testConnection);
  const showToast = useToast();

  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [draftUrls, setDraftUrls] = useState<Record<string, string>>({});
  const [draftBuckets, setDraftBuckets] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const statusMap = new Map(
    (statuses ?? []).map((s: ProviderStatus) => [s.provider, s])
  );

  async function onSaveKey(provider: string, needsUrl?: boolean) {
    const key = draftKeys[provider]?.trim();
    if (!key && !statusMap.get(provider)) {
      showToast("Isi API key dulu ya.", "warning");
      return;
    }
    if (!key && needsUrl && !statusMap.get(provider)?.projectUrl) return;
    setBusyProvider(provider);
    try {
      await saveKey({
        provider: provider as never,
        key: key ?? "",
        projectUrl: draftUrls[provider] || undefined,
        bucket: draftBuckets[provider]?.trim() || undefined,
      });
      showToast("API key disimpan. Jangan share ke siapa pun ya 🔐", "success");
      setDraftKeys((prev) => ({ ...prev, [provider]: "" }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal simpan key.", "error");
    } finally {
      setBusyProvider(null);
    }
  }

  async function onTest(provider: string) {
    setBusyProvider(provider + ":test");
    try {
      const result = await testConnection({ provider: provider as never });
      if (result.ok) {
        showToast("Koneksi berhasil ✅", "success");
      } else {
        showToast(result.error ?? "Koneksi gagal.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Koneksi gagal.", "error");
    } finally {
      setBusyProvider(null);
    }
  }

  async function onDelete(provider: string) {
    setBusyProvider(provider);
    try {
      await deleteKey({ provider: provider as never });
      showToast("API key dihapus.", "info");
    } finally {
      setBusyProvider(null);
    }
  }

  async function onPickEngine(engine: TextEngineId) {
    try {
      await setTextEngine({ engine });
      showToast(`Engine teks diganti ke ${engine}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal ganti engine.", "error");
    }
  }

  const [savingOverride, setSavingOverride] = useState<string | null>(null);
  async function onSetAgentOverride(
    agentId: string,
    engine: TextEngineId | null,
    model: string | null
  ) {
    setSavingOverride(agentId);
    try {
      await setAgentOverride({
        agentId,
        engine,
        model: model ?? undefined,
      });
      showToast(
        engine
          ? `Override ${agentId} disimpan (${engine}).`
          : `Override ${agentId} dihapus — ikuti default.`,
        "success"
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal simpan override.",
        "error"
      );
    } finally {
      setSavingOverride(null);
    }
  }

  async function onPickModel(model: string) {
    try {
      await setModel({ model });
      showToast(`Model diganti ke ${model}.`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal ganti model.", "error");
    }
  }

  const license = licenses?.[0];
  const currentEngine = settings?.textEngine ?? "gemini";
  const activeEngineId: TextEngineId = currentEngine;

  const checkTurso = useAction(api.turso.health);
  const [turso, setTurso] = useState<
    { ok: boolean; latencyMs: number; error?: string } | null
  >(null);
  const [tursoChecking, setTursoChecking] = useState(false);

  async function runTursoCheck() {
    setTursoChecking(true);
    try {
      setTurso(await checkTurso());
    } catch (err) {
      setTurso({
        ok: false,
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTursoChecking(false);
    }
  }

  useEffect(() => {
    void runTursoCheck();
  }, []);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Pengaturan</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
        <p className="mt-3 text-ink-2">
          Bisa jalan 100% GRATIS — Gemini &amp; Groq. Sisanya opsional. Semua
          key tersimpan privat di akunmu.
        </p>
      </header>

      <div className="max-w-2xl space-y-6">
        {/* ── Engine teks ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FAA61A]" />
              Engine Teks AI
            </CardTitle>
            <CardDescription>
              Cukup 1 engine buat mulai — pilih Gemini gratis. Kalau kuota
              habis atau engine gagal, sistem otomatis fallback ke engine lain
              yang key-nya keisi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ENGINES.map((engine) => {
              const status = statusMap.get(engine.id);
              const active = currentEngine === engine.id;
              const busy =
                busyProvider === engine.id ||
                busyProvider === `${engine.id}:test`;
              return (
                <div
                  key={engine.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all",
                    active
                      ? "border-[#FAA61A] bg-[#FAA61A]/5"
                      : "border-border-d bg-app"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => void onPickEngine(engine.id)}
                      disabled={busy}
                      aria-pressed={active}
                      className="flex items-center gap-2 text-left"
                    >
                      <span
                        className={cn(
                          "inline-flex h-4 w-4 items-center justify-center rounded-full border",
                          active ? "border-[#FAA61A]" : "border-ink-3"
                        )}
                      >
                        {active && (
                          <span className="h-2 w-2 rounded-full bg-[#FAA61A]" />
                        )}
                      </span>
                      <span className="text-sm font-bold text-ink">
                        {engine.name}
                      </span>
                      <Badge variant={active ? "success" : "outline"}>
                        {active ? "Engine Utama" : engine.badge === "GRATIS" ? "Gratis" : "Opsional"}
                      </Badge>
                    </button>
                    <KeyStateBadge status={status?.status} />
                  </div>

                  <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                    {engine.note}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-0 flex-1">
                      <input
                        type={showKeys[engine.id] ? "text" : "password"}
                        value={draftKeys[engine.id] ?? ""}
                        onChange={(e) =>
                          setDraftKeys((prev) => ({
                            ...prev,
                            [engine.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          status?.maskedKey ?? "Paste API key di sini..."
                        }
                        className="w-full rounded-lg border border-border-d bg-app px-3 py-2 pr-9 font-mono text-sm text-ink focus:border-brand focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKeys((prev) => ({
                            ...prev,
                            [engine.id]: !prev[engine.id],
                          }))
                        }
                        aria-label="Lihat/sembunyikan key"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                      >
                        {showKeys[engine.id] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !(draftKeys[engine.id]?.trim() ?? "")}
                      onClick={() => void onSaveKey(engine.id)}
                    >
                      {busyProvider === engine.id && (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      )}
                      Simpan
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!status}
                      onClick={() => void onTest(engine.id)}
                    >
                      {busyProvider === `${engine.id}:test` ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plug className="mr-1 h-3.5 w-3.5" />
                      )}
                      Test Connection
                    </Button>
                    {status && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void onDelete(engine.id)}
                        title="Hapus key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <KeyErrorNote status={status} />

                  {engine.id === activeEngineId && (
                    <div className="mt-3 border-t border-border-d pt-3">
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2">
                        Model {engine.name}
                      </label>
                      <select
                        value={
                          MODEL_OPTIONS[engine.id]?.some(
                            (o) => o.id === settings?.model
                          )
                            ? (settings?.model as string)
                            : ENGINE_MODEL_OPTIONS[engine.id][0].id
                        }
                        onChange={(e) => void onPickModel(e.target.value)}
                        className="h-10 w-full rounded-lg border border-border-d bg-app px-3 text-sm font-semibold text-ink outline-none transition-colors hover:border-[#FAA61A]"
                      >
                        {(MODEL_OPTIONS[engine.id] ?? []).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                 </div>
              );
            })}
            <p className="rounded-lg bg-info-bg p-3 text-xs text-info">
              💡 Mulai GRATIS: cukup Gemini (+ Groq cadangan). Biaya wajib = Rp
              0. Naik ke berbayar cuma kalau mau auto-generate gambar/video
              (KIE) atau copy kualitas premium.
            </p>
          </CardContent>
        </Card>

        {/* ── Override per agent (doc 13 step 3) ──────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FAA61A]" />
              Override Per Agent
            </CardTitle>
            <CardDescription>
              Kasih agent tertentu engine/model sendiri — mis. Reza pakai
              Claude Sonnet buat copy paling tajam, sisanya ikut default
              gratis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AGENTS.map((agent) => {
              const override = overrides?.find(
                (o) => o.agentId === agent.id
              );
              const rowEngine: TextEngineId | "" = override?.engine ?? "";
              return (
                <div
                  key={agent.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border-d bg-app p-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.name.charAt(0)}
                  </span>
                  <span className="w-28 shrink-0 text-sm font-bold" style={{ color: agent.color }}>
                    {agent.name}
                  </span>

                  <select
                    value={rowEngine}
                    onChange={(e) =>
                      void onSetAgentOverride(
                        agent.id,
                        (e.target.value || null) as TextEngineId | null,
                        null
                      )
                    }
                    disabled={savingOverride === agent.id}
                    className="h-9 rounded-lg border border-border-d bg-surface px-2 text-sm font-semibold text-ink outline-none transition-colors hover:border-[#FAA61A]"
                  >
                    <option value="">Ikuti default</option>
                    {ENGINES.map((engine) => (
                      <option key={engine.id} value={engine.id}>
                        {engine.name}
                      </option>
                    ))}
                  </select>

                  {rowEngine !== "" && (
                    <select
                      value={
                        MODEL_OPTIONS[rowEngine]?.some(
                          (o) => o.id === override?.model
                        )
                          ? (override?.model as string)
                          : ENGINE_MODEL_OPTIONS[rowEngine][0].id
                      }
                      onChange={(e) =>
                        void onSetAgentOverride(
                          agent.id,
                          rowEngine,
                          e.target.value
                        )
                      }
                      disabled={savingOverride === agent.id}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-border-d bg-surface px-2 text-sm text-ink outline-none transition-colors hover:border-[#FAA61A]"
                    >
                      {(MODEL_OPTIONS[rowEngine] ?? []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
            <p className="text-[11px] text-ink-3">
              Kalau engine yang di-override gak punya key valid, sistem
              otomatis fallback ke engine lain.
            </p>
          </CardContent>
        </Card>

        {/* ── Integrasi opsional ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-4 w-4 text-[#FAA61A]" />
              Integrasi Opsional
            </CardTitle>
            <CardDescription>
              Semua di bawah ini opsional — isi cuma kalau mau fiturnya.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {OPTIONAL_PROVIDERS.map((provider) => {
              const status = statusMap.get(provider.id);
              const busy =
                busyProvider === provider.id ||
                busyProvider === `${provider.id}:test`;
              return (
                <div
                  key={provider.id}
                  className="rounded-xl border border-border-d bg-app p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-bold text-ink">
                      {provider.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Opsional</Badge>
                      <KeyStateBadge status={status?.status} />
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                    {provider.note}
                  </p>

                  <div className="mt-3 space-y-2">
                    {provider.needsProjectUrl && (
                      <>
                        <input
                          type="url"
                          value={draftUrls[provider.id] ?? status?.projectUrl ?? ""}
                          onChange={(e) =>
                            setDraftUrls((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          placeholder="https://xxxx.supabase.co"
                          className="w-full rounded-lg border border-border-d bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                        />
                        <input
                          type="text"
                          value={draftBuckets[provider.id] ?? status?.bucket ?? ""}
                          onChange={(e) =>
                            setDraftBuckets((prev) => ({
                              ...prev,
                              [provider.id]: e.target.value,
                            }))
                          }
                          placeholder="Nama bucket publik (mis. ld-images, default castafree)"
                          className="w-full rounded-lg border border-border-d bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-brand focus:outline-none"
                        />
                      </>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type={showKeys[provider.id] ? "text" : "password"}
                        value={draftKeys[provider.id] ?? ""}
                        onChange={(e) =>
                          setDraftKeys((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        placeholder={
                          status?.maskedKey ??
                          (provider.needsProjectUrl
                            ? "service_role key..."
                            : "Paste API key di sini...")
                        }
                        className="min-w-0 flex-1 rounded-lg border border-border-d bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-brand focus:outline-none"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || !(draftKeys[provider.id]?.trim() ?? "")}
                        onClick={() => void onSaveKey(provider.id, provider.needsProjectUrl)}
                      >
                        {busyProvider === provider.id && (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        )}
                        Simpan
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!status}
                        onClick={() => void onTest(provider.id)}
                      >
                        {busyProvider === `${provider.id}:test` ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plug className="mr-1 h-3.5 w-3.5" />
                        )}
                        Test
                      </Button>
                      {status && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void onDelete(provider.id)}
                          title="Hapus key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <KeyErrorNote status={status} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* ── Tampilan ────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>Pilih tema tampilan aplikasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        {/* ── License ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-success" />
              License
            </CardTitle>
            <CardDescription>
              Status lisensi yang aktif di akun ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {license ? (
              <div className="rounded-lg border border-border-d bg-app p-4">
                <p className="font-mono text-sm font-semibold text-success">
                  {license.licenseKey}
                </p>
                <p className="mt-1 text-xs text-ink-2">
                  {license.customerName ?? license.email} · diaktivasi{" "}
                  {new Date(license.activatedAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-ink-2">
                Belum ada license aktif di akun ini. Aktivasi lewat halaman
                Beranda.
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Turso ───────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[#FAA61A]" />
              Database Turso
            </CardTitle>
            <CardDescription>
              Status koneksi ke database edge SQLite (libSQL) di backend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border-d bg-app p-4">
              {turso === null ? (
                <span className="flex items-center gap-2 text-sm text-ink-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#FAA61A]" />
                  Ngecek koneksi...
                </span>
              ) : turso.ok ? (
                <>
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-2.5 w-2.5 rounded-full bg-success" />
                    Terhubung
                  </span>
                  <span className="font-mono text-xs text-ink-2">
                    {turso.latencyMs} ms
                  </span>
                </>
              ) : (
                <span className="flex items-center gap-2 text-sm font-semibold text-danger">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                  Gagal terhubung
                </span>
              )}
            </div>
            {turso !== null && !turso.ok && turso.error && (
              <p className="text-xs text-danger">{turso.error}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runTursoCheck()}
              disabled={tursoChecking}
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", tursoChecking && "animate-spin")}
              />
              Cek Ulang
            </Button>
          </CardContent>
        </Card>

        {/* ── Akun ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[#FAA61A]" />
              Akun
            </CardTitle>
            <CardDescription>Keluar dari studio.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => void signOut()}
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KeyStateBadge({ status }: { status?: ProviderStatus["status"] }) {
  if (!status) return <Badge variant="outline">Belum ada key</Badge>;
  if (status === "ok") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Terhubung
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="danger">
        <XCircle className="mr-1 h-3 w-3" />
        Error
      </Badge>
    );
  }
  return <Badge variant="info">Belum dites</Badge>;
}

function KeyErrorNote({ status }: { status?: ProviderStatus }) {
  if (status?.status !== "error" || !status.lastError) return null;
  return (
    <p className="mt-2 rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">
      {status.lastError}
    </p>
  );
}
