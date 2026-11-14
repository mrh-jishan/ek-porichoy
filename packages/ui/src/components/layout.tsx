import type { ReactNode } from "react";
import { cn } from "../cn";

export function PageHeader({ title, description, actions, eyebrow }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <div className="mb-1 text-xs font-semibold tracking-wide text-brand-600 uppercase">{eyebrow}</div>}
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-muted sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, className }: { icon?: ReactNode; title: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line px-6 py-12 text-center text-sm text-muted", className)}>
      {icon && <div className="text-brand-300">{icon}</div>}
      {title}
    </div>
  );
}

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-shimmer rounded-lg bg-[linear-gradient(90deg,#eef2f0_25%,#f8faf9_50%,#eef2f0_75%)] bg-[length:200%_100%]", className)} />
);

/** Simple, accessible key/value list used for registry data and batch metadata. */
export function DefinitionList({ items, className }: { items: Array<{ term: ReactNode; detail: ReactNode; meta?: ReactNode }>; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between gap-4 py-2.5 text-sm">
          <dt className="text-muted">{it.term}</dt>
          <dd className="flex items-center gap-2 text-right font-medium text-ink">{it.detail}{it.meta}</dd>
        </div>
      ))}
    </dl>
  );
}
