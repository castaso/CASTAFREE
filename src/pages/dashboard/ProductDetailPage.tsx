import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAction, useQuery } from "convex/react";
import { api } from "@generated/api";
import type { Doc, Id } from "@generated/dataModel";
import {
  ArrowLeft,
  Boxes,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Play,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { AGENTS } from "@/data/team";
import {
  ArtifactChip,
  RunCard,
  TaskRow,
} from "@/pages/dashboard/PipelinePage";

type Product = Doc<"products">;
type Artifact = Doc<"artifacts">;
type PipelineRun = Doc<"pipelineRuns">;
type PipelineTask = Doc<"pipelineTasks">;

const ARTIFACT_GROUPS: { kinds: string[]; label: string }[] = [
  { kinds: ["product_brief"], label: "Produk Brief" },
  { kinds: ["bvi"], label: "Konsep & BVI" },
  { kinds: ["ugc_scripts"], label: "Script UGC" },
  { kinds: ["image_ad_brief"], label: "Script & Image Ads" },
  { kinds: ["ebook_pdf"], label: "Ebook PDF" },
  { kinds: ["landing_page"], label: "Landing Page" },
  { kinds: ["kie_veo_sheet"], label: "KIE & VEO" },
  { kinds: ["scalev_pack"], label: "Scalev Pack" },
];

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = useQuery(
    api.products.get,
    id ? { id: id as never } : "skip"
  );
  const runs = useQuery(
    api.pipelineData.listRunsByProduct,
    product ? { productId: product._id } : "skip"
  );
  const artifacts = useQuery(
    api.artifacts.listByProduct,
    product ? { productId: product._id } : "skip"
  );

  if (product === undefined) {
    return (
      <div className="flex h-64 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
        Loading...
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-sm text-ink-2">Produk gak ketemu.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard/products")}>
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Produk
        </Button>
      </div>
    );
  }

  const grouped = groupArtifacts(artifacts ?? []);

  return (
    <div>
      <header className="mb-8">
        <Link
          to="/dashboard/products"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Semua Produk
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-black text-ink">
            {product.name}
          </h1>
          <Badge variant={product.status === "published" ? "success" : "info"}>
            {product.status}
          </Badge>
        </div>
        <p className="mt-1 font-mono text-xs text-ink-3">
          /{product.slug} · dibikin bareng {product.agent} ·{" "}
          {new Date(product.date).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* ── Run agents for this product ──────────────────── */}
      <AgentRunner product={product} />

      {/* ── Workbench: outputs per kind ──────────────────── */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="mb-1 font-display text-lg font-bold text-ink">
            Workbench
          </h2>
          <p className="mb-4 text-sm text-ink-2">
            Semua output buat produk ini — script, gambar, ebook, landing page.
            Klik download buat nyimpen filenya.
          </p>
          {artifacts === undefined ? (
            <div className="flex items-center gap-2 py-4 text-sm text-ink-3">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading file...
            </div>
          ) : artifacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border-d bg-app py-10 text-center">
              <Boxes className="h-8 w-8 text-[#FAA61A]" />
              <div>
                <p className="font-semibold text-ink">Belum ada output</p>
                <p className="text-sm text-ink-2">
                  Jalanin agent di atas buat ngehasilin file pertama.
                </p>
              </div>
            </div>
          ) : (
            <WorkbenchTabs grouped={grouped} artifacts={artifacts} />
          )}
        </CardContent>
      </Card>

      {/* ── Run history for this product ─────────────────── */}
      <h2 className="mb-4 font-display text-lg font-bold text-ink">
        Riwayat Eksekusi
      </h2>
      {runs === undefined ? (
        <div className="flex h-24 items-center justify-center text-sm text-ink-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
          Loading...
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-ink-2">
            Belum ada run buat produk ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <RunCard key={run._id} run={run} tasks={[]} />
          ))}
        </div>
      )}
    </div>
  );
}

function groupArtifacts(artifacts: Artifact[]): Map<string, Artifact[]> {
  const map = new Map<string, Artifact[]>();
  for (const artifact of artifacts) {
    const group =
      ARTIFACT_GROUPS.find((g) => g.kinds.includes(artifact.kind))?.label ??
      "Lainnya";
    const list = map.get(group) ?? [];
    list.push(artifact);
    map.set(group, list);
  }
  return map;
}

/** Tabbed Workbench view (doc 10: "tab LP") — groups as filter tabs. */
function WorkbenchTabs({
  grouped,
  artifacts,
}: {
  grouped: Map<string, Artifact[]>;
  artifacts: Artifact[];
}) {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Only groups that actually have files get a tab; "Semua" is always there.
  const availableGroups = ARTIFACT_GROUPS.filter(
    (group) => (grouped.get(group.label)?.length ?? 0) > 0
  );
  const visibleGroups =
    activeTab === "all"
      ? availableGroups
      : availableGroups.filter((g) => g.label === activeTab);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
            activeTab === "all"
              ? "bg-[#FAA61A]/15 text-[#FAA61A]"
              : "bg-muted text-ink-2 hover:text-ink"
          )}
        >
          Semua ({artifacts.length})
        </button>
        {availableGroups.map((group) => {
          const count = grouped.get(group.label)?.length ?? 0;
          return (
            <button
              key={group.label}
              type="button"
              onClick={() => setActiveTab(group.label)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                activeTab === group.label
                  ? "bg-[#FAA61A]/15 text-[#FAA61A]"
                  : "bg-muted text-ink-2 hover:text-ink"
              )}
            >
              {group.label} ({count})
            </button>
          );
        })}
      </div>

      {visibleGroups.length === 0 ? (
        <p className="py-4 text-sm text-ink-3">
          Gak ada file di tab ini.
        </p>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((group) => {
            const items = grouped.get(group.label) ?? [];
            return (
              <div key={group.label}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">
                  <FileText className="h-3.5 w-3.5" />
                  {group.label} ({items.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {items.map((artifact) => (
                    <ArtifactChip key={artifact._id} artifact={artifact} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentRunner({ product }: { product: Product }) {
  const runAgents = useAction(api.pipelineAI.runAgents);
  const renderVeo = useAction(api.pipelineAI.renderVeo);
  const showToast = useToast();

  const [selected, setSelected] = useState<string[]>(
    AGENTS.map((agent) => agent.id)
  );
  const [running, setRunning] = useState(false);
  const [renderingVeo, setRenderingVeo] = useState(false);
  const [generateImages, setGenerateImages] = useState(false);
  const [referenceBook, setReferenceBook] = useState("");
  const [topicAngleOverride, setTopicAngleOverride] = useState("");

  // Live progress (doc 08 "output streaming"): while a run executes we
  // subscribe to its tasks; Convex reactivity pushes status changes.
  const liveRuns = useQuery(
    api.pipelineData.listRunsByProduct,
    running ? { productId: product._id } : "skip"
  );
  const [activeRunId, setActiveRunId] = useState<Id<"pipelineRuns"> | null>(null);
  const seenRunIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!running || !liveRuns) return;
    // The newest run created after the user pressed Jalankan is ours.
    const candidate = liveRuns.find(
      (r: PipelineRun) =>
        r.status === "running" && !seenRunIds.current.has(r._id)
    );
    if (candidate) {
      seenRunIds.current.add(candidate._id);
      setActiveRunId(candidate._id);
    }
  }, [running, liveRuns]);

  const activeTasks = useQuery(
    api.pipelineData.getTasksByRun,
    activeRunId ? { runId: activeRunId } : "skip"
  );

  async function onRenderVeo() {
    setRenderingVeo(true);
    try {
      const result = await renderVeo({ productId: product._id });
      if (result.ok) {
        showToast("Video Veo masuk Galeri 🎬", "success");
      } else {
        showToast(result.error ?? "Render Veo gagal.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Render Veo gagal.", "error");
    } finally {
      setRenderingVeo(false);
    }
  }

  const toggle = (agentId: string) => {
    setSelected((prev) =>
      prev.includes(agentId)
        ? prev.filter((a) => a !== agentId)
        : [...prev, agentId]
    );
  };

  async function onRun(all = false) {
    if (running) return;
    const ids = all ? AGENTS.map((agent) => agent.id) : selected;
    if (!all && ids.length === 0) {
      showToast("Pilih minimal satu agent dulu.", "warning");
      return;
    }
    setRunning(true);
    try {
      const result = await runAgents({
        topic: product.name,
        agentIds: ids,
        productId: product._id,
        generateImages,
        referenceBook: referenceBook.trim() || undefined,
        topicAngleOverride: topicAngleOverride.trim() || undefined,
      });
      if (result.ok) {
        showToast(
          `Selesai! ${result.artifactsSaved} file baru tersimpan di Workbench 🎉`,
          "success"
        );
        setReferenceBook("");
        setTopicAngleOverride("");
      } else {
        showToast(result.error ?? "Run gagal.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Run gagal.", "error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">
              Jalankan Agent
            </h2>
            <p className="mt-0.5 text-sm text-ink-2">
              Pilih karyawan AI yang mau kerjain produk ini — hasilnya otomatis
              masuk Workbench.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" disabled={running} onClick={() => void onRun(true)}>
              {running ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Jalankan Semua
            </Button>
            <Button disabled={running || selected.length === 0} onClick={() => void onRun()}>
              {running ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-4 w-4" />
              )}
              Jalankan Terpilih
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {AGENTS.map((agent) => {
            const active = selected.includes(agent.id);
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => toggle(agent.id)}
                disabled={running}
                aria-pressed={active}
                className={`rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-[#FAA61A] bg-[#FAA61A]/10 shadow-pop"
                    : "border-border-d bg-app opacity-70 hover:opacity-100"
                }`}
              >
                <span
                  className="mb-2 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </span>
                <p className="text-sm font-bold" style={{ color: agent.color }}>
                  {agent.name}
                </p>
                <p className="text-[11px] text-ink-2">{agent.role}</p>
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                    active
                      ? "bg-success-bg text-success"
                      : "bg-muted text-ink-3"
                  }`}
                >
                  {active ? (
                    <>
                      <ChevronDown className="h-2.5 w-2.5" />
                      Dipilih
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-2.5 w-2.5" />
                      Skip
                    </>
                  )}
                </span>
              </button>
            );
          })}

          {/* ── Dimas overrides (doc 09 step 2) ────────────── */}
          {selected.includes("dimas") && (
            <div className="col-span-full grid gap-3 rounded-lg border border-border-d bg-app p-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2">
                  Reference book{" "}
                  <span className="font-normal normal-case text-ink-3">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={referenceBook}
                  onChange={(e) => setReferenceBook(e.target.value)}
                  disabled={running}
                  placeholder="Buku/referensi buat struktur & isi ebook"
                  className="w-full rounded-lg border border-border-d bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2">
                  Topic angle override{" "}
                  <span className="font-normal normal-case text-ink-3">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={topicAngleOverride}
                  onChange={(e) => setTopicAngleOverride(e.target.value)}
                  disabled={running}
                  placeholder="Paksa angle tertentu, abaikan analisis sendiri"
                  className="w-full rounded-lg border border-border-d bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* ── Image-gen opt-in (doc 08) ──────────────────── */}
          {selected.includes("reza") && (
            <label className="col-span-full flex cursor-pointer items-center gap-2 rounded-lg border border-border-d bg-app px-3 py-2.5 text-sm text-ink sm:col-span-2 lg:col-span-5">
              <input
                type="checkbox"
                checked={generateImages}
                onChange={(e) => setGenerateImages(e.target.checked)}
                disabled={running}
                className="h-4 w-4 accent-[#FAA61A]"
              />
              Generate image ads via KIE{" "}
              <span className="text-xs text-ink-3">
                — langsung dibikinin gambarnya (butuh KIE key di Pengaturan)
              </span>
            </label>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border-d pt-4">
          <p className="text-xs text-ink-2">
            Punya sheet KIE &amp; VEO? Render Scene 1 langsung jadi video
            (butuh KIE key di Pengaturan).
          </p>
          <Button
            size="sm"
            variant="outline"
            disabled={renderingVeo}
            onClick={() => void onRenderVeo()}
          >
            {renderingVeo ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            {renderingVeo ? "Rendering... (1-4 menit)" : "Render Video VEO"}
          </Button>
        </div>

        {/* ── Live task progress ─────────────────────────── */}
        {running && activeTasks && activeTasks.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border-d">
            {activeTasks.map((task: PipelineTask) => (
              <TaskRow
                key={task._id}
                task={task}
                isExpanded={task.status === "completed"}
                onToggle={() => {}}
              />
            ))}
          </div>
        )}

        {running && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-info-bg p-3 text-sm text-info">
            <Loader2 className="h-4 w-4 animate-spin" />
            Agent lagi kerjain "{product.name}" — bisa makan waktu 1-5 menit
            tergantung jumlah agent.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
