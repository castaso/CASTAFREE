import { Loader2 } from "lucide-react";

export function LoaderScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-app)] text-[var(--text-secondary)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-primary)] text-[var(--text-on-primary)] shadow-pop">
        <span className="font-display text-base font-black tracking-tight">
          LD
        </span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />
        {label}
      </div>
    </div>
  );
}
