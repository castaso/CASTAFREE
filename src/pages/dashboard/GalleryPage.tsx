import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@generated/dataModel";
import {
  ArrowLeft,
  ArrowRight,
  CloudUpload,
  Download,
  ImageIcon,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";

type GalleryItem = Doc<"gallery">;

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const TYPE_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "png", label: "PNG" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "gif", label: "GIF" },
] as const;

const MIME_BY_TYPE: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

function matchesType(mimeType: string, filter: string): boolean {
  return filter === "all" || mimeType === MIME_BY_TYPE[filter];
}

function fmtSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

function fmtDate(ts: number) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(ts);
}

// Convex storage URL pattern: /api/storage/<storageId>
function storageUrl(item: GalleryItem): string {
  return `/api/storage/${item.storageId}`;
}

export function GalleryPage() {
  const items = useQuery(api.gallery.list);
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const saveGallery = useMutation(api.gallery.save);
  const removeGallery = useMutation(api.gallery.remove);
  const showToast = useToast();

  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const dragDepth = useRef(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items ?? []).filter(
      (item) =>
        (!q || item.name.toLowerCase().includes(q)) &&
        matchesType(item.mimeType, typeFilter)
    );
  }, [items, query, typeFilter]);

  const count = filtered.length;

  // ── Upload (single via picker, many via drag & drop) ──
  async function uploadFiles(files: File[]) {
    if (uploading) {
      showToast("Upload lagi jalan, tunggu sebentar...", "warning");
      return;
    }
    const valid = files.filter(
      (f) => f.type.startsWith("image/") && f.size <= MAX_SIZE
    );
    const skipped = files.length - valid.length;

    if (valid.length === 0) {
      showToast(
        skipped > 0
          ? "Tidak ada file yang valid — hanya gambar (maks 10 MB)."
          : "Hanya file gambar yang bisa diupload.",
        "warning"
      );
      return;
    }

    setUploading(true);
    setUploadDone(0);
    setUploadTotal(valid.length);

    let ok = 0;
    for (const file of valid) {
      try {
        // Step 1: Get upload URL
        const uploadUrl = await generateUploadUrl();

        // Step 2: Upload file to Convex storage
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!res.ok) throw new Error("Upload ditolak server.");
        const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

        // Step 3: Save metadata to gallery table
        await saveGallery({
          storageId,
          name: file.name,
          mimeType: file.type,
          size: file.size,
        });
        ok++;
      } catch {
        showToast(`Gagal upload "${file.name}".`, "error");
      }
      setUploadDone(ok);
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";

    if (ok > 0) {
      showToast(
        valid.length > 1
          ? `${ok} gambar berhasil diupload! 🎨`
          : "Gambar berhasil diupload! 🎨",
        "success"
      );
    }
    if (skipped > 0) {
      showToast(`${skipped} file dilewati (bukan gambar atau > 10 MB).`, "warning");
    }
  }

  async function onRemove(id: Id<"gallery">) {
    try {
      await removeGallery({ id });
      showToast("Gambar dihapus.", "info");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal hapus gambar.",
        "error"
      );
    }
  }

  // Delete from inside the lightbox: close it on success, rethrow on failure
  // so the lightbox can reset its busy state.
  async function onDeleteFromLightbox(item: GalleryItem) {
    try {
      await removeGallery({ id: item._id });
      showToast("Gambar dihapus.", "info");
      setPreviewIndex(null);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal hapus gambar.",
        "error"
      );
      throw err;
    }
  }

  // ── Drag & drop zone ──
  function onDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }
  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }
  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragActive(false);
    }
  }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      void uploadFiles(Array.from(e.dataTransfer.files));
    }
  }

  // Prevent the browser from navigating away when a file is dropped
  // outside the drop zone (e.g. on the sidebar).
  useEffect(() => {
    const prevent = (e: globalThis.DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // ── Lightbox navigation + keyboard ──
  const goPrev = () =>
    setPreviewIndex((i) =>
      i === null || count < 2 ? i : (i - 1 + count) % count
    );
  const goNext = () =>
    setPreviewIndex((i) => (i === null || count < 2 ? i : (i + 1) % count));

  useEffect(() => {
    if (previewIndex === null) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setPreviewIndex(null);
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewIndex, count]);

  const uploadLabel =
    uploading && uploadTotal > 0
      ? `Mengupload ${Math.min(uploadDone + 1, uploadTotal)}/${uploadTotal}...`
      : uploading
        ? "Mengupload..."
        : "Upload Gambar";

  return (
    <div>
      <header className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black text-ink">
              Galeri
            </h1>
            <p className="mt-1 text-ink-2">
              Koleksi visual dari semua produk yang udah dibuat.
            </p>
          </div>
          <div className="shrink-0">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) void uploadFiles(Array.from(files));
              }}
            />
            <Button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadLabel}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Toolbar: search + filter ─────────────────────── */}
      {items !== undefined && items.length > 0 && (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama gambar..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="gallery-type-filter"
              className="text-xs font-semibold uppercase tracking-wider text-ink-3"
            >
              Tipe
            </label>
            <select
              id="gallery-type-filter"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-border-d bg-surface px-3 text-sm font-semibold text-ink outline-none transition-colors hover:border-brand focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-ink-3 sm:ml-auto">
            {filtered.length} gambar
          </p>
        </div>
      )}

      {/* ── Drop zone ────────────────────────────────────── */}
      <div
        className="relative"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {items === undefined ? (
          <div className="flex h-48 items-center justify-center text-ink-2">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-ink-3">
                <ImageIcon className="h-8 w-8" />
              </span>
              <div>
                <p className="font-semibold text-ink">
                  Belum ada gambar di galeri
                </p>
                <p className="mt-1 max-w-sm text-sm text-ink-2">
                  Upload gambar produk, screenshot, desain landing page, atau
                  visual lain yang lu bikin bareng tim AI.
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Button
                  onClick={() => fileRef.current?.click()}
                  variant="outline"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4" />
                  Upload Sekarang
                </Button>
                <p className="flex items-center gap-1 text-xs text-ink-3">
                  <CloudUpload className="h-3.5 w-3.5" />
                  atau seret &amp; lepas gambar ke sini
                </p>
              </div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-ink-3">
                <ImageIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-ink">Tidak ada hasil</p>
                <p className="text-sm text-ink-2">
                  Coba kata kunci atau tipe file yang lain.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setTypeFilter("all");
                }}
              >
                <X className="h-3.5 w-3.5" />
                Reset Filter
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-3">
              <CloudUpload className="h-3.5 w-3.5" />
              Seret &amp; lepas gambar ke sini, atau pilih lewat tombol Upload
              — bisa banyak file sekaligus.
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item, index) => (
                <GalleryCard
                  key={item._id}
                  item={item}
                  onRemove={() => onRemove(item._id)}
                  onPreview={() => setPreviewIndex(index)}
                />
              ))}
            </div>
          </>
        )}

        {/* Drag overlay */}
        {dragActive && (
          <div className="pointer-events-none absolute inset-0 z-overlay flex items-center justify-center rounded-2xl border-2 border-dashed border-brand bg-brand/5 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-8 py-6 text-center shadow-modal animate-fade-up">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
                <CloudUpload className="h-7 w-7" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-ink">
                  Lepas untuk upload
                </p>
                <p className="text-sm text-ink-2">
                  Gambar JPG, PNG, atau WebP — maks 10 MB per file
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Lightbox ─────────────────────────────────────── */}
      {previewIndex !== null && count > 0 && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau gambar"
        >
          <GalleryLightbox
            item={filtered[Math.min(previewIndex, count - 1)]}
            index={Math.min(previewIndex, count - 1)}
            count={count}
            onClose={() => setPreviewIndex(null)}
            onPrev={goPrev}
            onNext={goNext}
            onDelete={onDeleteFromLightbox}
          />
        </div>
      )}
    </div>
  );
}

function LightboxImage({ item }: { item: GalleryItem }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgUrl = storageUrl(item);

  if (imgError) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-white/70">
        <ImageIcon className="h-10 w-10" />
        <p className="text-sm">Gambar gagal dimuat.</p>
      </div>
    );
  }

  return (
    <div className="relative flex max-h-[calc(92vh-9rem)] w-full items-center justify-center">
      {!imgLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/80" />
        </div>
      )}
      <img
        src={imgUrl}
        alt={item.name}
        className={cn(
          "max-h-full max-w-full rounded-lg object-contain shadow-lg transition-opacity duration-300",
          imgLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgError(true)}
      />
    </div>
  );
}

function GalleryLightbox({
  item,
  index,
  count,
  onClose,
  onPrev,
  onNext,
  onDelete,
}: {
  item: GalleryItem;
  index: number;
  count: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDelete: (item: GalleryItem) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const shortName =
    item.name.length > 28 ? `${item.name.slice(0, 28)}…` : item.name;

  async function handleDelete() {
    setBusy(true);
    try {
      await onDelete(item);
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div
      className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-surface shadow-modal animate-fade-up"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border-d px-4 py-3">
        <p className="min-w-0 truncate text-sm font-semibold text-ink">
          {item.name}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="tnum text-xs text-ink-3">
            {index + 1} / {count}
          </span>
          <a href={storageUrl(item)} download={item.name} title="Unduh gambar">
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5" />
              Unduh
            </Button>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={busy}
            title="Hapus gambar"
            className="text-danger hover:bg-danger-bg hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            title="Tutup (Esc)"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirm bar */}
      {confirming && (
        <div className="flex items-center justify-between gap-3 border-b border-danger/25 bg-danger-bg px-4 py-2.5 animate-fade-in">
          <p className="min-w-0 truncate text-sm font-semibold text-danger">
            Hapus "{shortName}" dari galeri?
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={busy}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void handleDelete()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              {busy ? "Menghapus..." : "Hapus"}
            </Button>
          </div>
        </div>
      )}

      {/* Image area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black/40 p-2 sm:p-4">
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={onPrev}
              title="Sebelumnya (←)"
              className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/70 sm:left-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              title="Berikutnya (→)"
              className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur-sm transition-all hover:scale-110 hover:bg-black/70 sm:right-4"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </>
        )}
        <LightboxImage item={item} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-d px-4 py-2.5 text-xs text-ink-3">
        <span>
          {fmtSize(item.size)} · {item.mimeType}
        </span>
        <span>{fmtDate(item.createdAt)}</span>
      </div>
    </div>
  );
}

function GalleryCard({
  item,
  onRemove,
  onPreview,
}: {
  item: GalleryItem;
  onRemove: () => void;
  onPreview: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group overflow-hidden rounded-xl border border-border-d bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
          </div>
        )}
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <ImageIcon className="h-8 w-8 text-ink-3" />
          </div>
        ) : (
          <img
            src={storageUrl(item)}
            alt={item.name}
            className={cn(
              "h-full w-full object-cover transition-all duration-300 group-hover:scale-105",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <button
            type="button"
            onClick={onPreview}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink shadow-lg transition-transform hover:scale-110"
            title="Lihat"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-danger shadow-lg transition-transform hover:scale-110"
            title="Hapus"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <p className="truncate text-sm font-semibold text-ink" title={item.name}>
          {item.name}
        </p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-ink-3">{fmtSize(item.size)}</p>
          <p className="text-[10px] text-ink-3">{fmtDate(item.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
