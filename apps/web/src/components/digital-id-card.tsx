"use client";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { LogoMark } from "./logo";

interface Props {
  nameBn: string;
  nameEn: string;
  nid: string;
  dob: string;
  region: string;
  labels: { title: string; subtitle: string; flip: string; verify: string; replaces: string; nid: string; dob: string };
  programs: string[];
}

/** Deterministic visual verification pattern derived from the NID (decorative; real verification is server-side). */
function VerifyPattern({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    return Array.from({ length: 121 }, (_, i) => {
      h ^= seed.charCodeAt(i % seed.length) + i;
      h = Math.imul(h, 16777619);
      return (h >>> 0) % 3 === 0;
    });
  }, [seed]);
  return (
    <svg viewBox="0 0 11 11" className="size-24 rounded-md bg-white p-1.5" shapeRendering="crispEdges" aria-hidden>
      {cells.map((on, i) => on && <rect key={i} x={i % 11} y={Math.floor(i / 11)} width="1" height="1" fill="#003326" />)}
      {[[0, 0], [8, 0], [0, 8]].map(([x, y]) => (
        <g key={`${x}${y}`}><rect x={x} y={y} width="3" height="3" fill="#003326" /><rect x={x! + 1} y={y! + 1} width="1" height="1" fill="#fff" /></g>
      ))}
    </svg>
  );
}

export function DigitalIdCard({ nameBn, nameEn, nid, dob, region, labels, programs }: Props) {
  const [flipped, setFlipped] = useState(false);
  const reduce = useReducedMotion();
  const face = "absolute inset-0 overflow-hidden rounded-2xl p-5 text-white shadow-lift [backface-visibility:hidden]";
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="relative block aspect-[1.586/1] w-full max-w-md [perspective:1200px]"
        aria-label={labels.flip}
      >
        <motion.div
          className="relative size-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 18 }}
          initial={reduce ? false : { rotateX: 12, y: 20, opacity: 0 }}
          whileInView={{ rotateX: 0, y: 0, opacity: 1 }}
        >
          {/* front */}
          <div className={`${face} bg-gov-pattern text-left`}>
            <div className="bg-dots absolute inset-0 opacity-60" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LogoMark className="size-8" />
                  <div className="leading-tight">
                    <div className="text-sm font-bold">{labels.title}</div>
                    <div className="text-[10px] text-brand-100">{labels.subtitle}</div>
                  </div>
                </div>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-wider">BD</span>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="truncate text-xl font-bold">{nameBn}</div>
                  <div className="truncate text-sm text-brand-100">{nameEn}</div>
                  <div className="pt-2 font-mono text-lg tracking-[0.2em]">{nid.replace(/(\d{3})(?=\d)/g, "$1 ")}</div>
                  <div className="flex gap-4 text-[11px] text-brand-100">
                    <span>{labels.dob}: {dob}</span>
                    <span>{region}</span>
                  </div>
                </div>
                <motion.div
                  className="relative grid size-14 shrink-0 place-items-center rounded-full bg-accent-500/90 text-xl font-bold ring-4 ring-white/20"
                  animate={reduce ? undefined : { boxShadow: ["0 0 0 0 rgba(244,42,65,.5)", "0 0 0 12px rgba(244,42,65,0)"] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                >
                  {nameEn.charAt(0)}
                </motion.div>
              </div>
            </div>
          </div>
          {/* back */}
          <div className={`${face} bg-brand-900 [transform:rotateY(180deg)]`}>
            <div className="flex h-full gap-4 text-left">
              <VerifyPattern seed={nid} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="text-xs text-brand-100">{labels.verify}</p>
                <p className="mt-3 text-sm font-semibold">{labels.replaces}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {programs.map((p) => <span key={p} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px]">{p}</span>)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </button>
      <p className="text-xs text-muted">{labels.flip}</p>
    </div>
  );
}
