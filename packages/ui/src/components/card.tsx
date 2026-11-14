import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

export const Card = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("rounded-card border border-line bg-white shadow-card", className)} {...p} />
);

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export const CardBody = ({ className, ...p }: HTMLAttributes<HTMLDivElement>) => <div className={cn("p-5", className)} {...p} />;
