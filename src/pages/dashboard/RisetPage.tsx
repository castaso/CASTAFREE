import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import type { Doc, Id } from "@generated/dataModel";
import {
  ArrowRight,
  Check,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/utils";

type Concept = Doc<"concepts">;

const CONCEPT_STATUS: Record<string, "success" | "warning" | "outline"> = {
  approved: "success",
  proposed: "warning",
  rejected: "outline",
};

const PRICE_TIERS = [
  "< Rp100rb",
  "Rp100rb - Rp500rb",
  "Rp500rb - Rp1jt",
  "> Rp1jt",
];

const DEPTHS = ["Ringkas", "Standar", "Dalam"];

function conceptLetter(index: number): string {
  return String.fromCharCode(64 + Math.max(1, Math.min(26, index)));
}

export function RisetPage() {
  const concepts = useQuery(api.researchData.listMine);
  const runResearch = useAction(api.researchAI.runResearch);
  const approveAndGenerate = useAction(api.researchAI.approveAndGenerate);
  const approveConcept = useMutation(api.researchAI.approveConcept);
  const rejectConcept = useMutation(api.researchAI.rejectConcept);
  const showToast = useToast();

  // Research form (doc 07)
  const [topic, setTopic] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [priceTier, setPriceTier] = useState(PRICE_TIERS[0]);
  const [founderAngle, setFounderAngle] = useState("");
  const [depth, setDepth] = useState(DEPTHS[1]);
  const [productType, setProductType] = useState<"digital" | "fisik">("digital");

  const [running, setRunning] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const [busyId, setBusyId] = useState<Id<"concepts"> | null>(null);

  // Progressive reveal for freshly returned concepts.
  useEffect(() => {
    if (!running && revealed > 0) return;
    if (concepts === undefined || running) return;
    const pending = Math.min(concepts.filter((c: Concept) => c.status === "proposed").length, 5);
    if (pending <= revealed) return;
    const timer = setInterval(() => {
      setRevealed((prev) => (prev >= pending ? prev : prev + 1));
    }, 220);
    return () => clearInterval(timer);
  }, [concepts, running, revealed]);

  async function onRun(event: FormEvent) {
    event.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed || running) return;
    setRunning(true);
    setRevealed(0);
    try {
      const result = await runResearch({
        topic: trimmed,
        targetMarket: targetMarket.trim() || undefined,
        priceTier,
        founderAngle: founderAngle.trim() || undefined,
        depth,
        productType,
      });
      if (result.ok) {
        showToast("Maya ngasih konsep A-E! 🎉", "success");
        setTopic("");
      } else {
        showToast(result.error ?? "Riset gagal.", "error");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Riset gagal.", "error");
    } finally {
      setRunning(false);
    }
  }

  async function onApprove(concept: Concept) {
    setBusyId(concept._id);
    try {
      const result = await approveAndGenerate({ conceptId: concept._id });
      showToast(
        result.briefGenerated
          ? `"${concept.title}" jadi produk + PRODUCT_BRIEF.md & BVI.md siap! 🚀`
          : `"${concept.title}" jadi produk. Brief & BVI bisa di-generate ulang lewat run agent.`,
        result.briefGenerated ? "success" : "warning"
      );
    } catch {
      // Fallback to the plain mutation so approval never blocks on AI.
      try {
        await approveConcept({ conceptId: concept._id });
        showToast(`"${concept.title}" jadi produk! 🚀`, "success");
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Gagal approve konsep.", "error");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(conceptId: Id<"concepts">) {
    setBusyId(conceptId);
    try {
      await rejectConcept({ conceptId });
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal reject konsep.",
        "error"
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">
          Riset Pasar
        </h1>
        <div className="mt-2 h-1 w-12 rounded-full bg-gradient-to-r from-[#303188] to-[#FAA61A]" />
        <p className="mt-3 text-ink-2">
          Jalanin Maya (Agent 01) buat riset &amp; validasi niche → 5 konsep →
          approve → produk + brief + BVI. Jalan pakai engine AI gratis.
        </p>
      </header>

      {/* ── Research form ────────────────────────────────── */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={onRun} className="space-y-4">
            <div>
              <label
                htmlFor="riset-topic"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
              >
                Niche idea
              </label>
              <Input
                id="riset-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: jualan online buat pemula, kelas desain Canva..."
                disabled={running}
                className="w-full"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="riset-target"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
                >
                  Target market
                </label>
                <Input
                  id="riset-target"
                  value={targetMarket}
                  onChange={(e) => setTargetMarket(e.target.value)}
                  placeholder="Mis. ibu rumah tangga 25-40 th"
                  disabled={running}
                />
              </div>
              <div>
                <label
                  htmlFor="riset-founder"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
                >
                  Founder angle{" "}
                  <span className="font-normal normal-case text-ink-3">(opsional)</span>
                </label>
                <Input
                  id="riset-founder"
                  value={founderAngle}
                  onChange={(e) => setFounderAngle(e.target.value)}
                  placeholder="Kisah/keunggulan lu sebagai founder"
                  disabled={running}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="riset-price"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
                >
                  Price tier
                </label>
                <select
                  id="riset-price"
                  value={priceTier}
                  onChange={(e) => setPriceTier(e.target.value)}
                  disabled={running}
                  className="h-10 w-full rounded-lg border border-border-d bg-app px-3 text-sm font-semibold text-ink outline-none transition-colors hover:border-[#FAA61A]"
                >
                  {PRICE_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="riset-depth"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
                >
                  Depth
                </label>
                <select
                  id="riset-depth"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  disabled={running}
                  className="h-10 w-full rounded-lg border border-border-d bg-app px-3 text-sm font-semibold text-ink outline-none transition-colors hover:border-[#FAA61A]"
                >
                  {DEPTHS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2">
                  Tipe produk
                </span>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
                  {(["digital", "fisik"] as const).map((tipe) => (
                    <button
                      key={tipe}
                      type="button"
                      onClick={() => setProductType(tipe)}
                      disabled={running}
                      aria-pressed={productType === tipe}
                      className={cn(
                        "rounded-md py-1.5 text-sm font-semibold capitalize transition-all",
                        productType === tipe
                          ? "bg-surface text-ink shadow-card"
                          : "text-ink-2 hover:text-ink"
                      )}
                    >
                      {tipe}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!topic.trim() || running}
              className="w-full sm:w-auto"
            >
              {running ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-4 w-4" />
              )}
              {running ? "Maya lagi riset..." : "Riset Sekarang"}
            </Button>
          </form>
          {running && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-info-bg p-3 text-sm text-info">
              <Loader2 className="h-4 w-4 animate-spin" />
              Maya lagi analisis pasar &amp; nyusun konsep A-E — biasanya
              20-60 detik.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Concepts ─────────────────────────────────────── */}
      <h2 className="mb-4 font-display text-lg font-bold text-ink">
        Konsep Produk
      </h2>

      {concepts === undefined ? (
        <div className="flex h-32 items-center justify-center text-sm text-ink-2">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#FAA61A]" />
          Loading...
        </div>
      ) : concepts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <Sparkles className="h-10 w-10 text-[#FAA61A]" />
            <div>
              <p className="font-semibold text-ink">Belum ada konsep</p>
              <p className="text-sm text-ink-2">
                Niche yang spesifik + ada pain jelas = konsep lebih tajam.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {concepts.map((concept: Concept, listIndex: number) => (
            <ConceptCard
              key={concept._id}
              concept={concept}
              busy={busyId === concept._id}
              revealDelay={
                concept.status === "proposed"
                  ? listIndex * 0.18
                  : undefined
              }
              hidden={
                concept.status === "proposed" &&
                revealed > 0 &&
                listIndex >= revealed
              }
              onApprove={() => void onApprove(concept)}
              onReject={() => void onReject(concept._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptCard({
  concept,
  busy,
  revealDelay,
  hidden,
  onApprove,
  onReject,
}: {
  concept: Concept;
  busy: boolean;
  revealDelay?: number;
  hidden?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card
      className={cn(
        "transition-all hover:shadow-pop",
        hidden !== undefined && !hidden && "animate-fade-up"
      )}
      style={
        revealDelay !== undefined && !hidden
          ? { animationDelay: `${revealDelay}s`, animationFillMode: "backwards" }
          : undefined
      }
    >
      <CardContent className={cn("p-5", hidden && "opacity-30")}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-display text-sm font-black text-white"
              style={{ backgroundColor: "#8B5CF6" }}
            >
              {conceptLetter(concept.index)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink-3">
                Topik: {concept.topic}
              </p>
              <h3 className="font-display font-bold text-ink">
                {concept.title}
              </h3>
            </div>
          </div>
          <Badge variant={CONCEPT_STATUS[concept.status] ?? "outline"}>
            {concept.status === "approved"
              ? "Jadi Produk"
              : concept.status === "rejected"
                ? "Ditolak"
                : "Usulan"}
          </Badge>
        </div>

        <dl className="space-y-1.5 text-sm">
          <ConceptField label="USP" value={concept.usp} highlight />
          <ConceptField label="Angle" value={concept.angle} />
          <ConceptField label="Avatar" value={concept.avatar} />
          <ConceptField label="Target" value={concept.targetAudience} />
          <ConceptField label="Format" value={concept.format} />
          <ConceptField label="Harga" value={concept.price} />
          {!concept.usp && !concept.angle && (
            <p className="whitespace-pre-wrap pt-1 text-xs leading-relaxed text-ink-2">
              {concept.rawText}
            </p>
          )}
        </dl>

        <div className="mt-4 flex items-center gap-2 border-t border-border-d pt-3">
          {concept.status === "approved" && concept.productId ? (
            <Link to={`/dashboard/products/${concept.productId}`}>
              <Button size="sm" variant="outline">
                Buka Produk
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : concept.status === "proposed" ? (
            <>
              <Button size="sm" onClick={onApprove} disabled={busy}>
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Review &amp; Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                disabled={busy}
              >
                <X className="h-3.5 w-3.5" />
                Tolak
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ConceptField({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0 text-sm",
          highlight ? "font-medium text-ink" : "text-ink"
        )}
      >
        {value}
      </dd>
    </div>
  );
}
