import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", {
  variants: {
    tone: {
      neutral: "bg-slate-50 text-slate-700 ring-slate-200",
      green: "bg-brand-50 text-brand-700 ring-brand-200",
      red: "bg-accent-50 text-accent-700 ring-accent-100",
      amber: "bg-amber-50 text-amber-800 ring-amber-200",
      blue: "bg-sky-50 text-sky-800 ring-sky-200",
      dark: "bg-brand-900 text-white ring-brand-900",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type Tone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export const Badge = ({ className, tone, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) => (
  <span className={cn(badgeVariants({ tone }), className)} {...p} />
);
