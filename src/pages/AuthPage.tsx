import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { KeyRound, Loader2, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/BrandMark";
import { cn } from "@/lib/utils";

type Mode = "signIn" | "signUp";

export function AuthPage() {
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo =
    new URLSearchParams(location.search).get("returnTo") || "/dashboard";

  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, returnTo]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn("password", { email, password, flow: mode });
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal masuk. Coba lagi atau daftar akun baru."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app px-4 py-10 font-body text-ink">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="group mx-auto mb-6 flex w-fit items-center gap-3"
        >
          <BrandMark className="h-12 w-12 shrink-0 transition-transform group-hover:scale-105" />
          <span className="font-display text-sm font-bold text-ink">
            CAST/|FREE
          </span>
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-border-d bg-surface p-7 pt-9 shadow-card">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#303188] via-[#303188] to-[#FAA61A]" />
          <div className="mb-6 text-center">
            <h1 className="font-display text-2xl font-black text-ink">
              {mode === "signIn" ? "Masuk ke Studio" : "Bikin Akun"}
            </h1>
            <p className="mt-1 text-sm text-ink-2">
              {mode === "signIn"
                ? "Senang liat lu balik lagi 👋"
                : "Daftar buat mulai bangun produk digital."}
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(["signIn", "signUp"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={cn(
                  "rounded-md py-2 text-sm font-semibold transition-all",
                  mode === m
                    ? "bg-surface text-ink shadow-card"
                    : "text-ink-2 hover:text-ink"
                )}
              >
                {m === "signIn" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="[email protected]"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "signIn" ? "current-password" : "new-password"
                  }
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  className="pl-9"
                />
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger"
              >
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {mode === "signIn" ? "Masuk..." : "Daftar..."}
                </>
              ) : mode === "signIn" ? (
                "Masuk"
              ) : (
                "Daftar Sekarang"
              )}
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-ink-2">
            <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FAA61A]" />
            <p>
              Setelah masuk, aktivasi license key-mu buat akses studio penuh.
              Belum punya license?{" "}
              <a
                href="https://levelingdigital.com"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#FAA61A] hover:underline"
              >
                Order disini
              </a>
              .
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink-3">
          <Link to="/" className="hover:text-ink-2">
            ← Kembali ke beranda
          </Link>
        </p>
      </div>
    </div>
  );
}
