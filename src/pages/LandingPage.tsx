import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Clapperboard,
  GraduationCap,
  KeyRound,
  Layers,
  Palette,
  PenLine,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { AGENTS } from "@/data/team";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BrandMark } from "@/components/BrandMark";

const AGENT_ICONS: Record<string, typeof Search> = {
  maya: Search,
  reza: PenLine,
  dimas: Boxes,
  sari: Palette,
  bayu: Clapperboard,
};

const PIPELINE = [
  { step: "01", title: "Riset", desc: "Maya riset pasar, niche, dan kompetitor.", icon: Search },
  { step: "02", title: "Copywriting", desc: "Reza nulis copy yang bikin orang action.", icon: PenLine },
  { step: "03", title: "Bangun Produk", desc: "Dimas nyusun produk digital dari konsep.", icon: Boxes },
  { step: "04", title: "Desain", desc: "Sari bikin visual dan landing page yang konversif.", icon: Palette },
  { step: "05", title: "Produksi", desc: "Bayu siapin script & storyboard video.", icon: Clapperboard },
];

const FEATURES = [
  {
    icon: Layers,
    title: "Pipeline AI Terpadu",
    desc: "Dari riset sampai produksi, semua agent bekerja dalam satu alur yang bisa lu pantau live.",
  },
  {
    icon: Zap,
    title: "Langsung Jadi",
    desc: "Produk digital, copy, dan desain di-generate otomatis — tinggal review dan publish.",
  },
  {
    icon: ShieldCheck,
    title: "Aktivasi License Aman",
    desc: "Setiap lisensi diverifikasi ke server resmi Leveling Digital, maksimal 1 device.",
  },
  {
    icon: BarChart3,
    title: "Kontrol Biaya",
    desc: "Estimasi penggunaan AI per agent biar budget tetep sehat dan jelas.",
  },
  {
    icon: GraduationCap,
    title: "AI Mentor",
    desc: "Belajar skill digital bareng mentor AI yang selalu siap 24/7.",
  },
  {
    icon: KeyRound,
    title: "Satu Key, Semua Akses",
    desc: "Aktivasi sekali, langsung akses semua fitur studio.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-app font-body text-ink">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-sticky border-b border-border-d/70 bg-app/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="group flex items-center gap-3">
            <BrandMark className="h-10 w-10 shrink-0 transition-transform group-hover:scale-105" />
            <span className="font-display text-sm font-bold text-ink">
              Leveling Digital
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink-2 md:flex">
            <a href="#agents" className="transition-colors hover:text-ink">
              Tim AI
            </a>
            <a href="#pipeline" className="transition-colors hover:text-ink">
              Cara Kerja
            </a>
            <a href="#features" className="transition-colors hover:text-ink">
              Fitur
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Masuk</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth?returnTo=%2Fdashboard">
                Mulai Sekarang
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            background:
              "radial-gradient(600px 300px at 70% 0%, rgba(239,68,68,0.14), transparent 70%), radial-gradient(500px 260px at 15% 10%, rgba(139,92,246,0.10), transparent 70%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:pt-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Badge variant="outline" className="mb-5 gap-1.5">
              <Sparkles className="h-3 w-3 text-brand" />
              Powered by 5 AI Agents
            </Badge>
            <h1 className="font-display text-4xl font-black leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Bangun produk digital
              <span className="text-brand"> bareng tim AI</span> yang selalu on.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Leveling Digital menggabungkan research, copywriting, product
              building, desain, dan produksi video dalam satu studio — dikerjakan
              agent AI yang saling nyambung.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link to="/auth?returnTo=%2Fdashboard">
                  Masuk ke Studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#agents">Kenalan sama Tim AI</a>
              </Button>
            </div>
            <div className="mt-10 flex items-center gap-8 text-sm text-ink-2">
              <div>
                <p className="font-display text-2xl font-black text-ink">5</p>
                <p>AI Agents</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="font-display text-2xl font-black text-ink">1</p>
                <p>Key untuk semua</p>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div>
                <p className="font-display text-2xl font-black text-ink">24/7</p>
                <p>Always ready</p>
              </div>
            </div>
          </motion.div>

          {/* Hero visual: mini pipeline card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="rounded-2xl border border-border-d bg-surface p-5 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Pipeline berjalan</p>
                <Badge variant="info">live</Badge>
              </div>
              <div className="space-y-2.5">
                {PIPELINE.slice(0, 4).map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.step}
                      className="flex items-center gap-3 rounded-lg border border-border-d bg-app px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-ink">
                          {item.title}
                        </p>
                        <p className="text-[10px] text-ink-3">
                          {item.desc.length > 42
                            ? item.desc.slice(0, 42) + "…"
                            : item.desc}
                        </p>
                      </div>
                      {index < 2 ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                          {index === 0 ? "jalan" : "nulis"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-warning">
                          antri
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-success-bg px-3 py-2.5 text-xs font-semibold text-success">
                <Rocket className="h-4 w-4" />
                Dimas nge-build produk baru…
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rotate-[-3deg] rounded-xl border border-border-d bg-elevated px-4 py-3 shadow-pop sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                License aktif
              </p>
              <p className="font-mono text-xs font-semibold text-success">
                LD-XXXX-XXXX-XXXX-XXXX
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Agents ──────────────────────────────────────── */}
      <section id="agents" className="border-y border-border-d bg-surface/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">
              Tim AI
            </p>
            <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Lima spesialis, satu studio.
            </h2>
            <p className="mt-3 text-ink-2">
              Setiap agent punya keahlian masing-masing dan bekerja bareng buat
              ngehasilin produk digital end-to-end.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((agent, index) => {
              const Icon = AGENT_ICONS[agent.id] ?? Sparkles;
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: index * 0.06 }}
                  className="group rounded-xl border border-border-d bg-surface p-5 shadow-card transition-all hover:-translate-y-1 hover:shadow-pop"
                >
                  <span
                    className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg transition-transform group-hover:scale-110"
                    style={{ background: agent.color }}
                  >
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <h3 className="font-display text-base font-bold text-ink">
                    {agent.name}
                  </h3>
                  <p className="text-xs font-semibold" style={{ color: agent.color }}>
                    {agent.role}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-2">
                    {agent.description}
                  </p>
                  <Badge
                    variant={agent.status === "active" ? "success" : "info"}
                    className="mt-3"
                  >
                    {agent.status}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pipeline ────────────────────────────────────── */}
      <section id="pipeline" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">
              Cara Kerja
            </p>
            <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Dari ide ke produk siap jual.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-5">
            {PIPELINE.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="relative rounded-xl border border-border-d bg-surface p-5 shadow-card"
                >
                  <span className="font-mono text-[11px] font-semibold text-brand">
                    {item.step}
                  </span>
                  <span className="mt-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <h3 className="mt-3 font-display text-sm font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-ink-2">
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="border-y border-border-d bg-surface/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-2xl">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-brand">
              Fitur
            </p>
            <h2 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Semua yang lu butuhin buat naik level.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className="rounded-xl border border-border-d bg-surface p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
                >
                  <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display text-base font-bold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-2">
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA band ────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl bg-[#0A0A0A] px-8 py-14 text-center text-white shadow-modal"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                background:
                  "radial-gradient(420px 220px at 50% 0%, rgba(239,68,68,0.35), transparent 70%)",
              }}
            />
            <div className="relative">
              <Badge variant="outline" className="mb-4 border-white/20 text-white/70">
                <KeyRound className="h-3 w-3" />
                Aktivasi license 1 device
              </Badge>
              <h2 className="font-display text-3xl font-black tracking-tight sm:text-4xl">
                Siap naik level digital?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-white/70">
                Masuk ke studio, aktivasi license, dan biarkan tim AI-mu yang
                kerja keras.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/auth?returnTo=%2Fdashboard">
                    Mulai Sekarang
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" asChild>
                  <a href="https://levelingdigital.com" target="_blank" rel="noreferrer">
                    Belum punya license?
                  </a>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border-d py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-ink-3 sm:flex-row">
          <div className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" />
            <span className="font-medium text-ink-2">Leveling Digital</span>
          </div>
          <p>© 2026 Leveling Digital. Dibuat bareng tim AI.</p>
        </div>
      </footer>
    </div>
  );
}
