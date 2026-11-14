"use client";
import { animate, motion, useInView, useMotionValue, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatCrore, formatMoney, formatNumber, type Locale } from "@ep/i18n";

const ease = [0.22, 1, 0.36, 1] as const;

export function FadeIn({ delay = 0, y = 12, className, children, ...rest }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ className, children, gap = 0.07 }: { className?: string; children: ReactNode; gap?: number }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease } } }}
    >
      {children}
    </motion.div>
  );
}

type NumberStyle = "number" | "money" | "crore" | "percent";
const fmt = (locale: Locale, v: number, style: NumberStyle) =>
  style === "money" ? formatMoney(locale, v)
  : style === "crore" ? formatCrore(locale, v)
  : style === "percent" ? `${formatNumber(locale, Math.round(v))}%`
  : formatNumber(locale, Math.round(v));

/** Counts up when scrolled into view; formats in Bangla or English numerals. */
export function AnimatedNumber({ value, locale, style = "number", className }: { value: number; locale: Locale; style?: NumberStyle; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => fmt(locale, 0, style));
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduce) return setDisplay(fmt(locale, value, style));
    const controls = animate(mv, value, { duration: 1.4, ease, onUpdate: (v) => setDisplay(fmt(locale, v, style)) });
    return () => controls.stop();
  }, [inView, value, locale, style, mv, reduce]);

  return <span ref={ref} className={className} aria-label={fmt(locale, value, style)}>{display}</span>;
}

/** Animated horizontal meter (coverage, targeting accuracy, budget use). */
export function Meter({ value, tone = "brand", className }: { value: number; tone?: "brand" | "accent" | "gold"; className?: string }) {
  const color = tone === "accent" ? "bg-accent-500" : tone === "gold" ? "bg-gold-500" : "bg-brand-500";
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-line/60 ${className ?? ""}`} role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        viewport={{ once: true }}
        transition={{ duration: 1.1, ease }}
      />
    </div>
  );
}

export { motion, AnimatePresence } from "motion/react";
