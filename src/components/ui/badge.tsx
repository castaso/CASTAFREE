import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
  {
    variants: {
      variant: {
        success: "bg-[var(--state-success-bg)] text-[var(--state-success)]",
        warning: "bg-[var(--state-warning-bg)] text-[var(--state-warning)]",
        danger: "bg-[var(--state-danger-bg)] text-[var(--state-danger)]",
        info: "bg-[var(--state-info-bg)] text-[var(--state-info)]",
        outline:
          "border border-[var(--border-default)] text-[var(--text-secondary)]",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
