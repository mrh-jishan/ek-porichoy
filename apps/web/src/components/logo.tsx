import { cn } from "@ep/ui";

/** Ek Porichoy mark: the flag's red disc inside a green shield, crossed by a single unifying stroke. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-10 shrink-0", className)} aria-hidden>
      <rect width="48" height="48" rx="12" fill="#006A4E" />
      <circle cx="21" cy="24" r="11" fill="#F42A41" />
      <path d="M12 33c6-4 18-14 26-18" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <circle cx="38" cy="15" r="2.6" fill="#fff" />
    </svg>
  );
}

export function Logo({ title, subtitle, light }: { title: string; subtitle?: string; light?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="leading-tight">
        <span className={cn("block text-lg font-bold whitespace-nowrap", light ? "text-white" : "text-brand-800")}>{title}</span>
        {subtitle && <span className={cn("hidden text-xs sm:block", light ? "text-brand-100" : "text-muted")}>{subtitle}</span>}
      </span>
    </span>
  );
}
