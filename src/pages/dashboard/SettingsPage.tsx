import { useEffect, useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import {
  Database,
  KeyRound,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

const MODEL_OPTIONS = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    description: "Cepat & hemat — default buat kerja harian.",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 mini",
    description: "Lebih pinter dikit, harga masih bersahabat.",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    description: "Paling pintar — buat produk premium. Paling mahal.",
  },
] as const;

export function SettingsPage() {
  const { signOut } = useAuthActions();
  const licenses = useQuery(api.licenses.myLicenses);
  const settings = useQuery(api.userSettings.getSettings);
  const setModel = useMutation(api.userSettings.setModel);
  const showToast = useToast();
  const [savingModel, setSavingModel] = useState(false);

  async function onPickModel(model: string) {
    setSavingModel(true);
    try {
      await setModel({ model });
      showToast(`Model AI diganti ke ${model}.`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal ganti model.",
        "error"
      );
    } finally {
      setSavingModel(false);
    }
  }

  const license = licenses?.[0];

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
          Konfigurasi akun, API keys, dan preferensi aplikasi.
        </p>
      </header>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>Pilih tema tampilan aplikasi.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#FAA61A]" />
              Model AI
            </CardTitle>
            <CardDescription>
              Model yang dipakai tim AI (Riset, Pipeline, agent per produk).
              Model lebih besar = hasil lebih bagus, biaya lebih tinggi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settings === undefined ? (
              <div className="flex items-center gap-2 py-2 text-sm text-ink-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              (() => {
                const currentModel = settings?.model ?? "gpt-4o-mini";
                return (
              <div className="space-y-2">
                {MODEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => void onPickModel(option.id)}
                    disabled={savingModel || option.id === currentModel}
                    aria-pressed={option.id === currentModel}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all",
                      option.id === currentModel
                        ? "border-[#FAA61A] bg-[#FAA61A]/10"
                        : "border-border-d bg-app hover:border-[#FAA61A]"
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {option.name}
                      </span>
                      <span className="block text-xs text-ink-3">
                        {option.description}
                      </span>
                    </span>
                    {option.id === currentModel ? (
                      <Badge variant="success">Dipakai</Badge>
                    ) : savingModel ? (
                      <Loader2 className="h-4 w-4 animate-spin text-ink-3" />
                    ) : (
                      <Badge variant="outline">Pilih</Badge>
                    )}
                  </button>
                ))}
                <p className="text-[11px] text-ink-3">
                  Default: gpt-4o-mini. Perubahan langsung kepake di run
                  berikutnya.
                </p>
              </div>
                );
              })()
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              API keys untuk integrasi layanan eksternal (AI Mentor, agent
              pipeline).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2">
                OpenAI API Key
              </label>
              <input
                type="password"
                readOnly
                value="sk-••••••••••••••••••••••••••••••"
                className="w-full rounded-lg border border-border-d bg-muted px-3 py-2.5 font-mono text-sm text-ink focus:border-brand focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-ink-3">
                Dikelola via API Keys di Freebuff — nggak disimpen di client.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2">
                License Key
              </label>
              <input
                type="text"
                readOnly
                value={license ? license.licenseKey : "LD-XXXX-XXXX-XXXX-XXXX"}
                className="w-full rounded-lg border border-border-d bg-muted px-3 py-2.5 font-mono text-sm text-ink focus:border-brand focus:outline-none"
              />
            </div>
          </CardContent>
        </Card>

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
