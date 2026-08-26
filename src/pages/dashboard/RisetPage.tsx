import { useState, type FormEvent } from "react";
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

type Concept = Doc<"concepts">;

const CONCEPT_STATUS: Record<string, "success" | "warning" | "outline"> = {
  approved: "success",
  proposed: "warning",
  rejected: "outline",
};

export function RisetPage() {
  const concepts = useQuery(api.researchData.listMine);
  const runResearch = useAction(api.researchAI.runResearch);
  const approveConcept = useMutation(api.researchAI.approveConcept);
  const rejectConcept = useMutation(api.researchAI.rejectConcept);
  const showToast = useToast();

  const [topic, setTopic] = useState("");
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<Id<"concepts"> | null>(null);

  async function onRun(event: FormEvent) {
    event.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed || running) return;
    setRunning(true);
    try {
      const result = await runResearch({ topic: trimmed });
      if (result.ok) {
        showToast("Maya ngasih 5 konsep produk baru! 🎉", "success");
        setTopic("");
      } else {
        showToast(result.error ?? "Riset gagal.", "error");
      }
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Riset gagal.",
        "error"
      );
    } finally {
      setRunning(false);
    }
  }

  async function onApprove(concept: Concept) {
    setBusyId(concept._id);
    try {
      await approveConcept({ conceptId: concept._id });
      showToast(`"${concept.title}" jadi produk! 🚀`, "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal approve konsep.",
        "error"
      );
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
          Jalanin Maya (Agent 01) buat riset pasar &amp; dapat 5 konsep produk
          baru. Approve satu konsep buat jadi produk.
        </p>
      </header>

      {/* ── Run research ─────────────────────────────────── */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <form onSubmit={onRun} className="flex items-end gap-3">
            <div className="flex-1">
              <label
                htmlFor="riset-topic"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-2"
              >
                Topik / niche yang mau diriset
              </label>
              <Input
                id="riset-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Contoh: ebook diet keto, jasa desain logo, kelas Canva..."
                disabled={running}
                className="w-full"
              />
            </div>
            <Button type="submit" disabled={!topic.trim() || running} className="shrink-0">
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
              Maya lagi analisis pasar &amp; nyusun 5 konsep — biasanya 20-60
              detik.
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
                Riset topik pertama lu di form atas!
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {concepts.map((concept: Concept) => (
            <ConceptCard
              key={concept._id}
              concept={concept}
              busy={busyId === concept._id}
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
  onApprove,
  onReject,
}: {
  concept: Concept;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <Card className="transition-all hover:shadow-pop">
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink-3">
              Topik: {concept.topic}
            </p>
            <h3 className="font-display font-bold text-ink">
              {concept.title}
            </h3>
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
          <ConceptField label="Angle" value={concept.angle} />
          <ConceptField label="Target" value={concept.targetAudience} />
          <ConceptField label="Format" value={concept.format} />
          <ConceptField label="Harga" value={concept.price} />
          {concept.angle === "" && (
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
              <Button
                size="sm"
                onClick={onApprove}
                disabled={busy}
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Jadi Produk
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

function ConceptField({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-ink">{value}</dd>
    </div>
  );
}
