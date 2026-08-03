import { ImageIcon } from "lucide-react";
import { useToast } from "@/components/toast";

const TILES = [
  "#8B5CF6",
  "#EF4444",
  "#F97316",
  "#16A34A",
  "#3B82F6",
  "#EC4899",
  "#06B6D4",
  "#F59E0B",
];

export function GalleryPage() {
  const showToast = useToast();
  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-black text-ink">Galeri</h1>
        <p className="mt-1 text-ink-2">
          Koleksi visual dari semua produk yang udah dibuat.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {TILES.map((color, index) => (
          <button
            key={color}
            type="button"
            onClick={() => showToast(`Membuka gambar ${index + 1}...`, "info")}
            className="group overflow-hidden rounded-xl border border-border-d bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
          >
            <div
              className="flex aspect-video items-center justify-center transition-transform group-hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${color}, ${color}88)`,
              }}
            >
              <ImageIcon className="h-8 w-8 text-white opacity-60" />
            </div>
            <div className="p-3 text-left">
              <p className="text-sm font-semibold text-ink">
                Galeri #{String(index + 1).padStart(2, "0")}
              </p>
              <p className="font-mono text-xs text-ink-3">Produk digital</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
