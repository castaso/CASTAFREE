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
  ImageIcon,
  Loader2,
  Play,
  Sparkles,
  XCircle,
} from "lucide-react";

type PipelineRun = Doc<"pipelineRuns">;
type PipelineTask = Doc<"pipelineTasks">;

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

function AgentAvatar({ agentId, size = "sm" }: { agentId: string; size?: "sm" | "md" | "lg" }) {
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

function TaskRow({ task, isExpanded, onToggle }: { task: PipelineTask; isExpanded: boolean; onToggle: () => void }) {
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

function RunCard({ run, tasks, onView }: { run: PipelineRun; tasks: PipelineTask[]; onView: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

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
  const [lastImages, setLastImages] = useState<number | null>(null);
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
        setLastImages(result.imagesSaved ?? 0);
        showToast(
          result.imagesSaved > 0
            ? `Pipeline selesai! ${result.imagesSaved} gambar masuk Galeri 🎉`
            : "Pipeline selesai! 🎉",
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
          Jalanin 5 agent AI sekaligus — dari riset sampai storyboard — dalam satu pipeline.
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
              Pipeline lagi jalan — 5 agent dipanggil berurutan, lalu 2 gambar
              AI dibuat &amp; disimpan otomatis ke Galeri. Ini bisa makan waktu
              1-3 menit.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Images saved to Galeri ───────────────────────── */}
      {lastImages !== null && lastImages > 0 && (
        <Card className="mb-8 border-success/25 bg-success-bg">
          <CardContent className="flex flex-col items-center justify-between gap-3 p-4 sm:flex-row">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/15 text-success">
                <ImageIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">
                  {lastImages} gambar AI masuk Galeri 🎨
                </p>
                <p className="text-xs text-ink-2">
                  Sampul produk &amp; hero landing page otomatis disimpan — cek
                  di Galeri.
                </p>
              </div>
            </div>
            <Link to="/dashboard/gallery">
              <Button size="sm" variant="outline" className="shrink-0">
                Buka Galeri
              </Button>
            </Link>
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
            <RunCard
              key={run._id}
              run={run}
              tasks={[]}
              onView={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}