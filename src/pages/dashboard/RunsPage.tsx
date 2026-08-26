import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@generated/api";
import type { Doc } from "@generated/dataModel";
import { History, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RunCard } from "@/pages/dashboard/PipelinePage";

type PipelineRun = Doc<"pipelineRuns">;

const FILTERS = [
  { id: "all", label: "Semua" },
  { id: "running", label: "Lagi Jalan" },
  { id: "completed", label: "Selesai" },
  { id: "failed", label: "Gagal" },
] as const;

export function RunsPage() {
  const runs = useQuery(api.pipelineData.listRuns);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const filtered =
    filter === "all"
      ? runs ?? []
      : (runs ?? []).filter((run) => run.status === filter);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">
          Riwayat Run
        </h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
        <p className="mt-3 text-ink-2">
          Semua proses yang pernah dijalankan — pipeline penuh maupun agent
          per produk. Klik buat lihat file hasilnya.
        </p>
      </header>

      {/* ── Status filter ────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === f.id
                ? "bg-[#FAA61A]/15 text-[#FAA61A]"
                : "bg-muted text-ink-2 hover:text-ink"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {runs === undefined ? (
        <div className="flex h-32 items-center justify-center text-sm text-ink-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <History className="h-10 w-10 text-[#FAA61A]" />
            <p className="text-sm text-ink-2">
              {filter === "all"
                ? "Belum ada run. Jalankan Pipeline atau Riset dulu!"
                : "Gak ada run dengan status ini."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((run: PipelineRun) => (
            <RunCard key={run._id} run={run} tasks={[]} />
          ))}
        </div>
      )}
    </div>
  );
}
