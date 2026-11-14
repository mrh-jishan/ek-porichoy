import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

/** Exported separately so links (next/link, i18n Link) can look like buttons without wrappers. */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md",
        accent: "bg-accent-500 text-white shadow-sm hover:bg-accent-600 hover:shadow-md",
        secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100",
        outline: "border border-line bg-white text-ink hover:border-brand-400 hover:text-brand-700",
        ghost: "text-muted hover:bg-brand-50 hover:text-brand-800",
        danger: "bg-white text-accent-600 border border-accent-100 hover:bg-accent-50",
        light: "bg-white text-brand-800 shadow-sm hover:bg-brand-50",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export function Button({ className, variant, size, loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
