import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@generated/api";
import { useToast } from "@/components/toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "@generated/dataModel";
import {
  Download,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  ZoomIn,
} from "lucide-react";

type GalleryItem = Doc<"gallery">;

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

export function GalleryPage() {
  const items = useQuery(api.gallery.list);
  const generateUploadUrl = useMutation(api.gallery.generateUploadUrl);
  const saveGallery = useMutation(api.gallery.save);
  const removeGallery = useMutation(api.gallery.remove);
  const showToast = useToast();

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onUpload(file: File) {
    if (!file || uploading) return;

    // Validate image
    if (!file.type.startsWith("image/")) {
      showToast("Hanya file gambar yang bisa diupload.", "warning");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast("Maksimal 10 MB per file.", "warning");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };

      // Step 3: Save metadata to gallery table
      await saveGallery({
        storageId,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });

      showToast("Gambar berhasil diupload! 🎨", "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Gagal upload gambar.",
        "error"
      );
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
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
              {uploading ? "Mengupload..." : "Upload Gambar"}
            </Button>
          </div>
        </div>
      </header>

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
            <Button
              onClick={() => fileRef.current?.click()}
              variant="outline"
            >
              <Upload className="h-4 w-4" />
              Upload Sekarang
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <GalleryCard
              key={item._id}
              item={item}
              onRemove={() => onRemove(item._id)}
              onPreview={() =>
                setPreviewUrl(previewUrl === item._id ? null : item._id)
              }
            />
          ))}
        </div>
      )}

      {/* ── Preview modal ──────────────────────────────── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-modal flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-surface shadow-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const item = items?.find((i) => i._id === previewUrl);
              if (!item) return null;
              const imgUrl = `TODO: getStorageUrl(${item.storageId})`;
              return (
                <>
                  <img
                    src=""
                    alt={item.name}
                    className="max-h-[70vh] w-full object-contain"
                  />
                  <div className="flex items-center justify-between border-t border-border-d px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {item.name}
                      </p>
                      <p className="text-xs text-ink-3">
                        {fmtSize(item.size)} · {item.mimeType}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewUrl(null)}
                    >
                      Tutup
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
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

  // Convex storage URL pattern: /api/storage/<storageId>
  const imgUrl = `/api/storage/${item.storageId}`;

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
            src={imgUrl}
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