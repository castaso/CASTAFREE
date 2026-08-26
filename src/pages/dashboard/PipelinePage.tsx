import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { api } from "@generated/api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AGENTS, AGENT_COLORS } from "@/data/team";
import type { Doc, Id } from "@generated/dataModel";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Globe,
  ImageIcon,
  Link2,
  Loader2,
  Play,
  Sparkles,
  Store,
  Video,
  XCircle,
} from "lucide-react";

type PipelineRun = Doc<"pipelineRuns">;
type PipelineTask = Doc<"pipelineTasks">;
type Artifact = Doc<"artifacts">;

const ARTIFACT_META: Record<
  string,
  { label: string; icon: typeof FileText }
> = {
  bvi: { label: "Konsep & BVI", icon: FileText },
  product_brief: { label: "Produk Brief", icon: FileText },
  ugc_scripts: { label: "Script UGC", icon: FileText },
  image_ad_brief: { label: "Brief Image Ads", icon: ImageIcon },
  ebook_pdf: { label: "Ebook PDF", icon: FileText },
  landing_page: { label: "Landing Page", icon: Globe },
  kie_veo_sheet: { label: "KIE & VEO", icon: Video },
  scalev_pack: { label: "Scalev Pack", icon: Store },
};

export function ArtifactChip({ artifact }: { artifact: Artifact }) {
  const meta = ARTIFACT_META[artifact.kind] ?? {
    label: artifact.kind,
    icon: FileText,
  };
  const Icon = meta.icon;
  const url = `/api/storage/${artifact.storageId}`;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-d bg-app px-2.5 py-1.5 text-xs font-medium text-ink">
      <Icon className="h-3.5 w-3.5 shrink-0 text-[#FAA61A]" />
      <span className="max-w-52 truncate">{artifact.name}</span>
      {artifact.kind === "landing_page" && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="rounded p-0.5 text-ink-3 transition-colors hover:text-[#FAA61A]"
          title="Buka landing page di tab baru"
        >
          <Globe className="h-3.5 w-3.5" />
        </a>
      )}
      {artifact.publicUrl && (
        <button
          type="button"
          onClick={() => void navigator.clipboard.writeText(artifact.publicUrl!)}
          title="Copy link publik (Supabase)"
          className="rounded p-0.5 text-ink-3 transition-colors hover:text-[#FAA61A]"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
      )}
      <a
        href={url}
        download={artifact.name}
        className="rounded p-0.5 text-ink-3 transition-colors hover:text-[#FAA61A]"
        title={`Download ${meta.label}`}
      >
        <Download className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}

const AGENT_ORDER = ["maya", "reza", "dimas", "sari", "bayu"];

const RUN_STATUS: Record<string, "info" | "success" | "danger"> = {
  running: "info",
  completed: "success",
  failed: "danger",
};

const TASK_STATUS: Record<string, "info" | "success" | "danger" | "outline"> = {
  pending: "outline",
  running: "info",
  completed: "success",
  failed: "danger",
};

function fmtDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts);
}

export function AgentAvatar({ agentId, size = "sm" }: { agentId: string; size?: "sm" | "md" | "lg" }) {
  const agent = AGENTS.find((a) => a.id === agentId);
  const initial = agent?.name?.charAt(0) ?? "?";
  const color = AGENT_COLORS[agentId] ?? "#6B7280";
  const dims = size === "lg" ? "h-10 w-10 text-sm" : size === "md" ? "h-8 w-8 text-xs" : "h-6 w-6 text-[10px]";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ${dims}`}
      style={{ backgroundColor: color }}
    >
      {initial}
    </span>
  );
}

export function TaskRow({ task, isExpanded, onToggle }: { task: PipelineTask; isExpanded: boolean; onToggle: () => void }) {
  const agent = AGENTS.find((a) => a.id === task.agentId);
  const color = AGENT_COLORS[task.agentId] ?? "#6B7280";

  return (
    <div className="border-b border-border-d last:border-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <AgentAvatar agentId={task.agentId} />
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-ink" style={{ color }}>
            {task.agentName}
          </span>
          <p className="text-xs text-ink-3">
            Langkah {task.step} · {task.model}
          </p>
        </div>
        {task.status === "running" && (
          <Loader2 className="h-4 w-4 animate-spin text-info" />
        )}
        {task.status === "completed" && (
          <CheckCircle2 className="h-4 w-4 text-success" />
        )}
        {task.status === "failed" && (
          <XCircle className="h-4 w-4 text-danger" />
        )}
        {task.status === "pending" && (
          <Clock className="h-4 w-4 text-ink-3" />
        )}
        <Badge variant={TASK_STATUS[task.status] ?? "outline"}>
          {task.status}
        </Badge>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-ink-3" />
        ) : (
          <ChevronRight className="h-4 w-4 text-ink-3" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-border-d bg-app/50 px-5 py-4">
          {task.output ? (
            <div className="prose prose-sm max-w-none text-ink">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {task.output}
              </div>
            </div>
          ) : task.error ? (
            <div className="rounded-lg bg-danger-bg p-3 text-sm text-danger">
              {task.error}
            </div>
          ) : task.status === "running" ? (
            <div className="flex items-center gap-2 text-sm text-ink-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              {task.agentName} lagi ngerjain tugasnya...
            </div>
          ) : (
            <p className="text-sm text-ink-3">Menunggu giliran...</p>
          )}
          {task.promptTokens !== undefined && task.status === "completed" && (
            <div className="mt-3 flex items-center gap-3 text-xs text-ink-3">
              <span>Token: {task.promptTokens} in / {task.completionTokens} out</span>
              {task.cost !== undefined && (
                <span>Biaya: ${task.cost.toFixed(6)}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RunCard({ run, tasks }: { run: PipelineRun; tasks: PipelineTask[] }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const artifacts = useQuery(
    api.artifacts.listByRun,
    expanded ? { runId: run._id } : "skip"
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
        >
          <Sparkles className="h-5 w-5 text-[#FAA61A] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink truncate">{run.topic}</p>
            <p className="text-xs text-ink-3">
              {fmtDate(run.createdAt)}
              {run.completedAt && ` · selesai ${fmtDate(run.completedAt)}`}
            </p>
            {run.imagesSaved !== undefined && run.imagesSaved > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-success">
                <ImageIcon className="h-3 w-3" />
                {run.imagesSaved} gambar disimpan ke Galeri
              </p>
            )}
          </div>
          <Badge variant={RUN_STATUS[run.status] ?? "outline"}>
            {run.status === "running" && (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            )}
            {run.status}
          </Badge>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-ink-3" />
          ) : (
            <ChevronRight className="h-4 w-4 text-ink-3" />
          )}
        </button>

        {expanded && (
          <div className="border-t border-border-d">
            {tasks.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-sm text-ink-3">
                {run.status === "running" ? "Pipeline lagi jalan..." : "Belum ada task."}
              </div>
            ) : (
              tasks.map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  isExpanded={!!expandedTasks[task._id]}
                  onToggle={() =>
                    setExpandedTasks((prev) => ({
                      ...prev,
                      [task._id]: !prev[task._id],
                    }))
                  }
                />
              ))
            )}

            {run.status === "completed" && (
              <div className="border-t border-border-d bg-app/50 px-5 py-4">
                <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">
                  <FileText className="h-3.5 w-3.5" />
                  Hasil &amp; File Siap Pakai
                </p>
                {artifacts === undefined ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-ink-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading file...
                  </div>
                ) : artifacts.length === 0 ? (
                  <p className="py-1 text-sm text-ink-3">
                    Gak ada file tersimpan untuk run ini.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {artifacts.map((artifact) => (
                      <ArtifactChip key={artifact._id} artifact={artifact} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PipelinePage() {
  const runs = useQuery(api.pipelineData.listRuns);
  const runPipeline = useAction(api.pipelineAI.runPipeline);
  const showToast = useToast();

  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<Id<"pipelineRuns"> | null>(null);
  const [lastSummary, setLastSummary] = useState<{ images: number; artifacts: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for the active run's tasks every 3s while running
  const activeTasks = useQuery(
    api.pipelineData.getTasksByRun,
    activeRunId ? { runId: activeRunId } : "skip"
  );

  // Auto-poll while running
  useEffect(() => {
    if (running) {
      pollRef.current = setInterval(() => {
        // re-render triggers the useQuery to refetch
        setActiveRunId((prev) => prev);
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [running]);

  async function onRun() {
    const trimmed = topic.trim();
    if (!trimmed || running) return;
    setRunning(true);
    setActiveRunId(null);
    try {
      const result = await runPipeline({ topic: trimmed });
      if (result.ok) {
        setActiveRunId(result.runId);
        setLastSummary({
          images: result.imagesSaved ?? 0,
          artifacts: result.artifactsSaved ?? 0,
        });
        showToast(
          `Pipeline selesai! ${result.artifactsSaved} file siap pakai${
            result.imagesSaved > 0 ? ` + ${result.imagesSaved} gambar di Galeri` : ""
          } 🎉`,
          "success"
        );
      } else {
        showToast(result.error ?? "Pipeline gagal.", "error");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Pipeline gagal.",
        "error"
      );
    } finally {
      setRunning(false);
      setTopic("");
    }
  }

  const isAnyRunning = running || (runs ?? []).some((r: PipelineRun) => r.status === "running");

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Pipeline AI</h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
        <p className="mt-3 text-ink-2">
          Jalanin 5 agent AI sekaligus — riset, copy, ebook PDF, landing page,
          dan iklan — dalam satu pipeline.
        </p>
      </header>

      {/* ── Run Pipeline ────────────────────────────────── */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="mb-6 flex items-center gap-4">
            {AGENT_ORDER.map((id, i) => {
              const agent = AGENTS.find((a) => a.id === id);
              const color = AGENT_COLORS[id] ?? "#6B7280";
              return (
                <div key={id} className="flex items-center gap-1">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: color }}
                    title={agent?.name}
                  >
                    {agent?.name?.charAt(0)}
                  </span>
                  {i < AGENT_ORDER.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-ink-3" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="pipeline-topic"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
              >
                Topik produk
              </label>
              <Input
                id="pipeline-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: ebook diet keto, kursus desain Canva, template landing page..."
                disabled={isAnyRunning}
                className="w-full"
              />
            </div>
            <Button
              onClick={onRun}
              disabled={!topic.trim() || isAnyRunning}
              className="shrink-0"
            >
              {running ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              {running ? "Memproses..." : "Jalankan"}
            </Button>
          </div>

          {isAnyRunning && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-info-bg p-3 text-sm text-info">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pipeline lagi jalan — 5 agent bikin konsep &amp; BVI, 5 script UGC,
              3 ebook, landing page 14 section, setting KIE + prompt VEO, lalu
              image ad dibuat otomatis. Ini bisa makan waktu 3-6 menit.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Run summary: files & images ──────────────────── */}
      {lastSummary !== null && (lastSummary.artifacts > 0 || lastSummary.images > 0) && (
        <Card className="mb-8 border-success/25 bg-success-bg">
          <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {lastSummary.artifacts} file siap jual +{" "}
                  {lastSummary.images} gambar AI masuk Galeri 🎨
                </p>
                <p className="text-xs text-ink-2">
                  BVI, 3 ebook PDF, landing page, KIE/VEO, dan export pack
                  Scalev — buka run di Riwayat untuk download. Produk juga
                  udah didaftarin otomatis.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link to="/dashboard/products">
                <Button size="sm" variant="outline">
                  Lihat Produk
                </Button>
              </Link>
              <Link to="/dashboard/gallery">
                <Button size="sm" variant="outline">
                  Buka Galeri
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Agent Team Visual ────────────────────────────── */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="mb-5 font-display text-lg font-bold text-ink">
            Tim Agent
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="rounded-xl border border-border-d bg-app p-4 text-center transition-all hover:shadow-pop"
              >
                <span
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </span>
                <h3
                  className="text-sm font-bold"
                  style={{ color: agent.color }}
                >
                  {agent.name}
                </h3>
                <p className="text-xs text-ink-2">{agent.role}</p>
                <p className="mt-1 text-[11px] text-ink-3">
                  {agent.description}
                </p>
                <Badge
                  variant={agent.status === "active" ? "success" : "info"}
                  className="mt-2"
                >
                  {agent.status === "active" ? "Aktif" : "Beta"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── History ──────────────────────────────────────── */}
      <h2 className="mb-4 font-display text-lg font-bold text-ink">
        Riwayat Pipeline
      </h2>

      {runs === undefined ? (
        <div className="flex h-32 items-center justify-center text-sm text-ink-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
          Loading...
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Sparkles className="h-10 w-10 text-[#FAA61A]" />
            <div>
              <p className="font-semibold text-ink">Belum ada pipeline</p>
              <p className="text-sm text-ink-2">
                Jalanin pipeline pertama lu dengan ngetik topik di atas!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">              {runs.map((run: PipelineRun) => (
            <RunCard key={run._id} run={run} tasks={[]} />
          ))}
        </div>
      )}
    </div>
  );
}