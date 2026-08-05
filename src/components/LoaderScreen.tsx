import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export function LoaderScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--bg-app)] text-[var(--text-secondary)]">
      <BrandMark className="h-14 w-14 animate-pulse-slow" />
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" />
        {label}
      </div>
    </div>
  );
}
