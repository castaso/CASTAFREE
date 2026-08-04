import { Link } from "react-router-dom";
import { Coins, MessageSquarePlus, Sparkles } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@generated/api";
import type { Doc } from "@generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type UsageRow = Doc<"usage">;

const AGENT_COLORS: Record<string, string> = {
  Maya: "#8B5CF6",
  Reza: "#EF4444",
  Dimas: "#F97316",
  Sari: "#16A34A",
  Bayu: "#3B82F6",
};

const ESTIMATES = [
  { agent: "Maya", task: "Research & Analysis", range: "$0.50 - $2.00", status: "Termasuk", variant: "success" as const },
  { agent: "Reza", task: "Copywriting", range: "$0.30 - $1.50", status: "Termasuk", variant: "success" as const },
  { agent: "Dimas", task: "Product Building", range: "$0.80 - $3.00", status: "Termasuk", variant: "success" as const },
  { agent: "Sari", task: "Web Design", range: "$0.60 - $2.50", status: "Termasuk", variant: "success" as const },
  { agent: "Bayu", task: "Video Production", range: "$1.00 - $4.00", status: "Beta", variant: "info" as const },
];

function fmtCost(cost: number): string {
  if (cost >= 0.01) return `$${cost.toFixed(2)}`;
  if (cost > 0) return `$${cost.toFixed(4)}`;
  return "$0.00";
}

function fmtTokens(n: number): string {
  return n.toLocaleString("id-ID");
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="border-border-d">
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">
          {label}
        </p>
        <p className="mt-2 font-display text-2xl font-black text-ink">
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-ink-2">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function CostPage() {
  const usage = useQuery(api.usage.listUsage);
  const summary = useQuery(api.usage.usageSummary);

  const loading = usage === undefined || summary === undefined;
  const rows: UsageRow[] = usage ?? [];
  const s = summary ?? {
    totalCost: 0,
    totalTokens: 0,
    totalCalls: 0,
    monthCost: 0,
    monthTokens: 0,
    monthCalls: 0,
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Biaya</h1>
        <p className="mt-1 text-ink-2">
          Pemakaian AI lu secara real-time — dihitung dari tiap panggilan model
          yang beneran kepake.
        </p>
      </header>

      {/* ── Summary cards ─────────────────────────────── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Bulan Ini"
          value={fmtCost(s.monthCost)}
          sub={`${fmtTokens(s.monthTokens)} token · ${s.monthCalls} panggilan`}
        />
        <StatCard
          label="Total Biaya"
          value={fmtCost(s.totalCost)}
          sub="Semua waktu"
        />
        <StatCard
          label="Total Token"
          value={fmtTokens(s.totalTokens)}
          sub={`${s.totalCalls} panggilan AI`}
        />
        <Card className="border-border-d bg-[var(--brand-primary)]/5">
          <CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-2">
              Estimasi Produk
            </p>
            <p className="mt-2 font-display text-2xl font-black text-ink">
              $0.50 – $4.00
            </p>
            <p className="mt-1 text-xs text-ink-2">
              per produk, lihat referensi di bawah
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Real usage table ──────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">
                Penggunaan Aktual
              </h2>
              <p className="text-sm text-ink-2">
                Tercatat otomatis setiap AI dipanggil.
              </p>
            </div>
            <Badge variant="success" className="shrink-0">
              Live
            </Badge>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-ink-2">
              Ngitung biaya…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-brand">
                <Coins className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-ink">
                  Belum ada penggunaan AI
                </p>
                <p className="mt-1 max-w-sm text-sm text-ink-2">
                  Begitu lu ngobrol sama AI Mentor atau jalanin pipeline agent,
                  biaya & token-nya bakal tercatat di sini otomatis.
                </p>
              </div>
              <Link
                to="/dashboard/mentor"
                className="mt-2 inline-flex items-center gap-2 rounded-[10px] bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] transition-all hover:bg-[var(--brand-primary-hover)] hover:shadow-lg"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Coba AI Mentor
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-d">
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Waktu
                    </th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Sumber
                    </th>
                    <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Model
                    </th>
                    <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Token In
                    </th>
                    <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Token Out
                    </th>
                    <th className="py-3 pr-4 text-right text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Total
                    </th>
                    <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-ink-2">
                      Biaya
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {rows.map((row) => (
                    <tr
                      key={row._id}
                      className="border-b border-border-d transition-colors last:border-0 hover:bg-muted/60"
                    >
                      <td className="whitespace-nowrap py-3 pr-4 text-ink-2">
                        {dateFmt.format(row.createdAt)}
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="info">{row.source}</Badge>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-ink">
                        {row.model}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink-2">
                        {fmtTokens(row.promptTokens)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink-2">
                        {fmtTokens(row.completionTokens)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-ink">
                        {fmtTokens(row.totalTokens)}
                      </td>
                      <td className="py-3 text-right font-mono font-semibold text-ink">
                        {fmtCost(row.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Estimate reference ────────────────────────── */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h2 className="font-display text-lg font-bold text-ink">
              Referensi Estimasi per Agent
            </h2>
          </div>
          <p className="mb-4 text-sm text-ink-2">
            Kisaran biaya per task ketika pipeline agent aktif penuh — data
            aktual tetap yang di tabel atas.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-d">
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Agent
                  </th>
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Task
                  </th>
                  <th className="py-3 pr-4 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Estimasi Biaya
                  </th>
                  <th className="py-3 text-xs font-semibold uppercase tracking-wider text-ink-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {ESTIMATES.map((row) => (
                  <tr
                    key={row.agent}
                    className="border-b border-border-d last:border-0"
                  >
                    <td className="py-3 pr-4">
                      <span
                        className="font-semibold"
                        style={{ color: AGENT_COLORS[row.agent] }}
                      >
                        {row.agent}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-ink-2">{row.task}</td>
                    <td className="py-3 pr-4 font-mono text-ink">
                      {row.range}
                    </td>
                    <td className="py-3">
                      <Badge variant={row.variant}>{row.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
