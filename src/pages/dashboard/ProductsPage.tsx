import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import { Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast";
import { AGENTS } from "@/data/team";
import type { Doc, Id } from "@generated/dataModel";

type Product = Doc<"products">;

const STATUS_BADGE: Record<string, "success" | "warning" | "info"> = {
  published: "success",
  draft: "warning",
  processing: "info",
};

export function ProductsPage() {
  const products = useQuery(api.products.list);
  const createProduct = useMutation(api.products.create);
  const removeProduct = useMutation(api.products.remove);
  const seedSamples = useMutation(api.products.seedSamples);
  const showToast = useToast();

  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [agent, setAgent] = useState(AGENTS[0].name);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [creating, setCreating] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      void seedSamples();
    }
  }, [seedSamples]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const slug = trimmed
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      await createProduct({ name: trimmed, slug, agent, status });
      showToast("Produk berhasil dibuat 🚀", "success");
      setName("");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal bikin produk.",
        "error"
      );
    } finally {
      setCreating(false);
    }
  }

  async function onRemove(id: Id<"products">) {
    try {
      await removeProduct({ id });
      showToast("Produk dihapus.", "info");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal hapus produk.",
        "error"
      );
    }
  }

  const filtered = (products ?? []).filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Produk</h1>
        <p className="mt-1 text-ink-2">
          Semua produk digital yang udah lu bangun bareng tim AI.
        </p>
      </header>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* List */}
        <div>
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari produk..."
                className="pl-9"
              />
            </div>
          </div>

          {products === undefined ? (
            <div className="flex h-48 items-center justify-center text-ink-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-sm text-ink-2">
                {query
                  ? "Gak ada produk yang cocok sama pencarian."
                  : "Belum ada produk. Bikin yang pertama pake form di samping!"}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product: Product) => (
                <Card
                  key={product._id}
                  className="group transition-all hover:-translate-y-0.5 hover:shadow-pop"
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <span className="text-sm font-semibold" style={{ color: AGENTS.find((a) => a.name === product.agent)?.color ?? "#6B7280" }}>
                        {product.agent}
                      </span>
                      <Badge variant={STATUS_BADGE[product.status] ?? "outline"}>
                        {product.status}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-ink">{product.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-ink-3">
                      /{product.slug}
                    </p>
                    <div className="mt-4 flex items-center justify-between border-t border-border-d pt-3">
                      <p className="text-xs text-ink-3">
                        {new Date(product.date).toLocaleDateString("id-ID", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <button
                        type="button"
                        onClick={() => onRemove(product._id)}
                        aria-label={`Hapus ${product.name}`}
                        className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-danger-bg hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Create form */}
        <Card className="h-fit">
          <CardContent className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-ink">
              <Plus className="h-4 w-4 text-brand" />
              Produk Baru
            </h2>
            <form onSubmit={onCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="product-name">Nama produk</Label>
                <Input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ebook Marketing Digital"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-agent">Agent</Label>
                <select
                  id="product-agent"
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                  className="h-10 w-full rounded-lg border border-border-d bg-app px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                >
                  {AGENTS.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name} — {a.role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="product-status">Status</Label>
                <select
                  id="product-status"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as "published" | "draft")
                  }
                  className="h-10 w-full rounded-lg border border-border-d bg-app px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Bikin Produk
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
