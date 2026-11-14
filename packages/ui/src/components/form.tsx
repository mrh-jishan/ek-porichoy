import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../cn";

const control =
  "w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-muted/70 transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none disabled:bg-surface aria-[invalid=true]:border-accent-500";

export const Input = ({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn(control, "h-10", className)} {...p} />;
export const Textarea = ({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn(control, "py-2", className)} {...p} />;
export const Select = ({ className, ...p }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn(control, "h-10", className)} {...p} />;

/** Label + control + hint/error, with correct a11y wiring. One component for every form field. */
export function Field({ label, htmlFor, hint, error, children, className }: {
  label: ReactNode; htmlFor: string; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">{label}</label>
      {children}
      {error ? <p role="alert" className="text-xs font-medium text-accent-600">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
