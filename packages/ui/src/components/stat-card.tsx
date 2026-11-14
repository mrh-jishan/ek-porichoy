import type { ReactNode } from "react";
import { cn } from "../cn";

/** KPI tile. `value` is a node so callers can pass <AnimatedNumber/> or static text. */
export function StatCard({ label, value, icon, hint, tone = "brand", className }: {
  label: ReactNode; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: "brand" | "accent" | "gold" | "ink"; className?: string;
}) {
  const ring = { brand: "bg-brand-50 text-brand-700", accent: "bg-accent-50 text-accent-600", gold: "bg-gold-100 text-amber-800", ink: "bg-slate-100 text-slate-700" }[tone];
  return (
    <div className={cn("group relative overflow-hidden rounded-card border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-lift", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg transition-transform group-hover:scale-110", ring)}>{icon}</span>}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-ink tabular-nums sm:text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
