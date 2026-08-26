import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import {
  ArrowRight,
  Boxes,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast";
import {
  readActivationPrefill,
  clearActivationPrefill,
} from "@/lib/activationPrefill";

export function HomePage() {
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const licenses = useQuery(api.licenses.myLicenses);
  const products = useQuery(api.products.list);
  const activate = useAction(api.licenses.activate);
  const recordActivation = useMutation(api.licenses.recordActivation);
  const showToast = useToast();

  const fingerprint = useMemo(() => {
    const hash = "xxxxxxxxxxxxxxxx".replace(/x/g, () =>
      "0123456789abcdef"[Math.floor(Math.random() * 16)]
    );
    return `web-${hash}`;
  }, []);

  const license = licenses?.[0];
  const isLoading = licenses === undefined || products === undefined;

  // Coming from /activate with an email-link prefill: fill the activation
  // form automatically, then clear it so it doesn't linger in the session.
  useEffect(() => {
    if (license) return;
    const prefill = readActivationPrefill();
    if (prefill) {
      setEmail(prefill.email);
      setLicenseKey(prefill.key.toUpperCase());
      clearActivationPrefill();
    }
  }, [license]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await activate({ licenseKey, email });
      if (!result.success) {
        setError(result.reason ?? "Aktivasi gagal. Cek key & email lalu coba lagi.");
        return;
      }
      await recordActivation({
        licenseKey,
        email,
        customerName: result.customerName,
      });
      showToast("License berhasil diaktivasi! 🎉", "success");
      setLicenseKey("");
      setEmail("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi."
      );
    } finally {
      setLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
        Memuat studio...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-black text-ink">
          {license ? `Halo, ${license.customerName ?? "Bos"}! 👋` : "Aktivasi CAST/|FREE"}
        </h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
        <p className="mt-3 text-ink-2">
          {license
            ? "Studio siap dipakai. Tim AI-mu standby buat kerja."
            : "Masukin email + license key dari email aktivasi yang lu terima setelah purchase."}
        </p>
      </header>

      {license ? (
        <>
          {/* Welcome stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="transition-all hover:shadow-pop">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-bg text-success">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                    License
                  </p>
                  <p className="font-mono text-sm font-semibold text-ink">
                    {license.licenseKey}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-pop">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#FAA61A]/15 text-[#FAA61A]">
                  <Boxes className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                    Produk
                  </p>
                  <p className="font-display text-2xl font-black text-ink">
                    {products.length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-pop">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-bg text-info">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                    AI Agents
                  </p>
                  <p className="font-display text-2xl font-black text-ink">5</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">
                    Mulai bangun produk
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-2">
                    Cek produk yang lagi jalan atau mulai riset yang baru.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" asChild>
                    <Link to="/dashboard/products">Kelola Produk</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/dashboard/mentor">
                      Coba AI Mentor
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Activation */}
          <Card className="max-w-lg">
            <CardContent className="p-6">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="activation-email">Email customer</Label>
                  <Input
                    id="activation-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="[email protected]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="activation-key">License Key</Label>
                  <Input
                    id="activation-key"
                    type="text"
                    required
                    value={licenseKey}
                    onChange={(e) =>
                      setLicenseKey(e.target.value.toUpperCase())
                    }
                    placeholder="LD-XXXX-XXXX-XXXX-XXXX"
                    className="font-mono uppercase"
                  />
                  <p className="text-[11px] text-ink-2">
                    Format: LD-XXXX-XXXX-XXXX-XXXX (di email aktivasi lu).
                  </p>
                </div>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger"
                  >
                    ⚠ {error}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      Aktivasi Sekarang
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Device fingerprint */}
          <Card className="max-w-lg">
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-ink">
                📍 Device fingerprint:
              </p>
              <p className="mt-1 break-all font-mono text-sm text-ink-2">
                {fingerprint}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-ink-2">
                Activation ngedaftarin device ini ke license lu (max 1 device).
                Mau pindah ke laptop lain? Hubungi admin.
              </p>
            </CardContent>
          </Card>

          <p className="text-xs text-ink-2">
            Belum dapet license?{" "}
            <a
              href="https://levelingdigital.com"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#FAA61A] hover:underline"
            >
              Order disini
            </a>{" "}
            · License server:{" "}
            <code className="text-ink-3">https://license.levelingdigital.com</code>
          </p>
        </>
      )}
    </div>
  );
}
