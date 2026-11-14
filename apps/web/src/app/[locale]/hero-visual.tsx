"use client";
import { Banknote, Building2, Fingerprint, HeartPulse, Home, Landmark, Smartphone, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

const NODES = [
  { icon: Smartphone, label: "bKash · Nagad" },
  { icon: Banknote, label: "Banks" },
  { icon: Home, label: "Land" },
  { icon: Landmark, label: "NBR" },
  { icon: Zap, label: "Utility" },
  { icon: HeartPulse, label: "DGHS" },
  { icon: Building2, label: "Ministries" },
];

/** Animated hub-and-spoke: one NID at the centre, every registry orbiting and connected. */
export function HeroVisual() {
  const reduce = useReducedMotion();
  const R = 140;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]" aria-hidden>
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="-200 -200 400 400" className="absolute inset-0 size-full">
          <circle r={R} fill="none" stroke="rgba(255,255,255,.18)" strokeDasharray="4 6" />
          <circle r={R - 60} fill="none" stroke="rgba(255,255,255,.08)" />
          {NODES.map((_, i) => {
            const a = (i / NODES.length) * Math.PI * 2;
            return (
              <motion.line
                key={i} x1={0} y1={0} x2={Math.cos(a) * R} y2={Math.sin(a) * R}
                stroke="rgba(255,255,255,.35)" strokeWidth={1.5} strokeDasharray="3 5"
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, delay: 0.3 + i * 0.1 }}
              />
            );
          })}
        </svg>
        {NODES.map(({ icon: Icon, label }, i) => {
          const a = (i / NODES.length) * Math.PI * 2;
          return (
            <motion.div
              key={label}
              className="absolute top-1/2 left-1/2"
              style={{ x: Math.cos(a) * R * 1.05 - 28, y: Math.sin(a) * R * 1.05 - 28 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 260, damping: 18 }}
            >
              <motion.div
                animate={reduce ? undefined : { rotate: -360 }}
                transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
                className="grid size-14 place-items-center rounded-2xl bg-white text-brand-700 shadow-lift"
                title={label}
              >
                <Icon className="size-6" />
              </motion.div>
            </motion.div>
          );
        })}
      </motion.div>
      <motion.div
        className="absolute top-1/2 left-1/2 grid size-32 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent-500 text-white shadow-[0_0_0_14px_rgba(255,255,255,.08)]"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        <motion.span
          className="absolute inset-0 rounded-full border-2 border-accent-400"
          animate={reduce ? undefined : { scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
        <div className="text-center">
          <Fingerprint className="mx-auto size-10" />
          <div className="mt-1 text-sm font-bold tracking-widest">NID</div>
        </div>
      </motion.div>
    </div>
  );
}
