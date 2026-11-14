"use client";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";

/**
 * Digital view of the citizen's NID, laid out like the Bangladesh smart NID card
 * (bilingual header, photo + signature, নাম/Name/পিতা/মাতা/Date of Birth, red ID NO; address,
 * blood group, birthplace and barcode on the back).
 *
 * Deliberate differences from the physical card so it cannot be printed as a counterfeit:
 * no national emblem (platform mark instead), a permanent "নমুনা · SAMPLE" watermark,
 * and no machine-readable zone. Real verification always happens against the EC NID server.
 */
export interface NidCardProps {
  nameBn: string;
  nameEn: string;
  fatherNameBn: string | null;
  motherNameBn: string | null;
  dob: string; // ISO yyyy-mm-dd
  nid: string;
  bloodGroup: string | null;
  birthPlace: string | null;
  address: string;
  issuedAt: string; // ISO
  programs: string[];
  labels: { flip: string; verify: string; replaces: string };
}

const fmtCardDate = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(iso));

/** Stable pseudo-random generator seeded by the NID (decorative patterns only). */
const useSeeded = (seed: string, n: number) =>
  useMemo(() => {
    let h = 2166136261;
    return Array.from({ length: n }, (_, i) => {
      h ^= seed.charCodeAt(i % seed.length) + i;
      h = Math.imul(h, 16777619);
      return (h >>> 0) / 4294967296;
    });
  }, [seed, n]);

/** Fine wavy security-print background (guilloche), drawn as SVG. */
function Guilloche() {
  const paths = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const y = 8 + i * 9;
        let d = `M0 ${y}`;
        for (let x = 0; x <= 340; x += 10) d += ` Q${x + 5} ${y + (i % 2 ? 4 : -4)} ${x + 10} ${y}`;
        return d;
      }),
    [],
  );
  return (
    <svg viewBox="0 0 340 214" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
      <defs>
        <radialGradient id="nid-glow" cx="70%" cy="55%" r="60%">
          <stop offset="0" stopColor="#f42a41" stopOpacity="0.07" />
          <stop offset="1" stopColor="#f42a41" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="340" height="214" fill="url(#nid-glow)" />
      {paths.map((d, i) => <path key={i} d={d} fill="none" stroke="#006a4e" strokeOpacity="0.07" strokeWidth="0.6" />)}
      <circle cx="235" cy="120" r="62" fill="none" stroke="#006a4e" strokeOpacity="0.06" strokeWidth="14" />
    </svg>
  );
}

function Watermark() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden" aria-hidden>
      <span className="-rotate-[18deg] text-[9cqw] font-black tracking-[0.2em] whitespace-nowrap text-accent-500/10 select-none">
        নমুনা · SAMPLE
      </span>
    </div>
  );
}

function Flag() {
  return (
    <svg viewBox="0 0 10 6" className="h-[5.5cqw] w-auto rounded-[1px] shadow-sm" aria-hidden>
      <rect width="10" height="6" fill="#006a4e" />
      <circle cx="4.5" cy="3" r="2" fill="#f42a41" />
    </svg>
  );
}

function PlatformMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-[8.5cqw] w-auto shrink-0" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#fff" stroke="#006a4e" strokeWidth="2" />
      <circle cx="21" cy="24" r="10" fill="#f42a41" />
      <path d="M12 32c6-4 17-13 24-17" stroke="#006a4e" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function Photo({ initial }: { initial: string }) {
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[0.6cqw] border border-brand-900/20 bg-gradient-to-b from-sky-50 to-slate-200">
      <svg viewBox="0 0 40 50" className="absolute inset-x-0 bottom-0 w-full text-slate-400" aria-hidden>
        <circle cx="20" cy="18" r="9" fill="currentColor" />
        <path d="M3 50c1-11 8-17 17-17s16 6 17 17z" fill="currentColor" />
      </svg>
      <span className="absolute right-[1cqw] bottom-[0.6cqw] text-[2.4cqw] font-bold text-white/90">{initial}</span>
    </div>
  );
}

function Signature({ seed }: { seed: string }) {
  const r = useSeeded(seed, 8);
  const d = `M2 ${10 + r[0]! * 4} C ${10 + r[1]! * 8} ${2 + r[2]! * 4}, ${18 + r[3]! * 6} ${16 - r[4]! * 4}, 30 8 S ${44 + r[5]! * 6} ${14 + r[6]! * 2}, 58 ${6 + r[7]! * 4}`;
  return (
    <svg viewBox="0 0 60 18" className="h-[4.5cqw] w-full" aria-hidden>
      <path d={d} fill="none" stroke="#1e3a8a" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function Barcode({ seed }: { seed: string }) {
  const r = useSeeded(seed, 70);
  let x = 0;
  return (
    <svg viewBox="0 0 220 30" preserveAspectRatio="none" className="h-[8cqw] w-full" aria-hidden>
      {r.map((v, i) => {
        const w = 0.8 + Math.floor(v * 3) * 0.9;
        const rect = i % 2 === 0 ? <rect key={i} x={x} y="0" width={w} height="30" fill="#0f1f19" /> : null;
        x += w + 0.7;
        return rect;
      })}
    </svg>
  );
}

const Row = ({ label, children, className }: { label: string; children: ReactNode; className?: string }) => (
  <div className="flex items-baseline gap-[1cqw] leading-tight">
    <span className="w-[16cqw] shrink-0 text-[2.5cqw] text-slate-600">{label}</span>
    <span className={`min-w-0 truncate text-[2.9cqw] text-slate-900 ${className ?? ""}`}>{children}</span>
  </div>
);

export function DigitalIdCard(p: NidCardProps) {
  const [flipped, setFlipped] = useState(false);
  const reduce = useReducedMotion();
  const face = "absolute inset-0 overflow-hidden rounded-[3cqw] border border-brand-900/15 bg-[#f3faf6] shadow-lift [backface-visibility:hidden]";
  const nidSpaced = p.nid.replace(/(\d{3})(?=\d)/g, "$1 ");

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        className="@container relative block aspect-[85.6/54] w-full max-w-[480px] text-left [perspective:1400px]"
        aria-label={p.labels.flip}
      >
        <motion.div
          className="relative size-full [transform-style:preserve-3d]"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 18 }}
          initial={reduce ? false : { rotateX: 14, y: 24, opacity: 0 }}
          whileInView={{ rotateX: 0, y: 0, opacity: 1 }}
          viewport={{ once: true }}
        >
          {/* ── Front ── */}
          <div className={face}>
            <Guilloche />
            <div className="relative flex h-full flex-col">
              <header className="flex items-center gap-[2cqw] border-b-[0.4cqw] border-brand-700/70 px-[3cqw] pt-[2.2cqw] pb-[1.4cqw]">
                <PlatformMark />
                <div className="min-w-0 flex-1 text-center leading-tight">
                  <div className="text-[3.3cqw] font-bold text-brand-800">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার</div>
                  <div className="text-[2.3cqw] font-semibold text-brand-700">Government of the People&apos;s Republic of Bangladesh</div>
                  <div className="text-[2.5cqw] font-bold text-accent-600">
                    জাতীয় পরিচয় পত্র · National ID Card <span className="font-medium text-slate-500">(Digital)</span>
                  </div>
                </div>
                <Flag />
              </header>
              <div className="flex flex-1 gap-[3cqw] px-[3cqw] pt-[2.4cqw] pb-[2cqw]">
                <div className="flex w-[21cqw] shrink-0 flex-col gap-[0.8cqw]">
                  <Photo initial={p.nameEn.charAt(0)} />
                  <Signature seed={p.nid} />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-[0.5cqw]">
                  <div className="space-y-[1cqw]">
                    <Row label="নাম:" className="text-[3.4cqw] font-bold">{p.nameBn}</Row>
                    <Row label="Name:" className="font-semibold tracking-wide uppercase">{p.nameEn}</Row>
                    <Row label="পিতা:">{p.fatherNameBn ?? "-"}</Row>
                    <Row label="মাতা:">{p.motherNameBn ?? "-"}</Row>
                  </div>
                  <div className="space-y-[0.6cqw]">
                    <Row label="Date of Birth:" className="font-semibold text-accent-600">{fmtCardDate(p.dob)}</Row>
                    <Row label="ID NO:" className="font-mono text-[3.8cqw] font-bold tracking-[0.12em] text-accent-600">{nidSpaced}</Row>
                  </div>
                </div>
              </div>
            </div>
            <Watermark />
          </div>

          {/* ── Back ── */}
          <div className={`${face} [transform:rotateY(180deg)]`}>
            <Guilloche />
            <div className="relative flex h-full flex-col px-[3.5cqw] pt-[3cqw] pb-[2.5cqw]">
              <p className="text-[2.3cqw] leading-snug text-slate-600">{p.labels.verify}</p>
              <div className="mt-[2cqw] space-y-[1.1cqw] text-[2.6cqw] text-slate-900">
                <div className="flex gap-[1.5cqw]"><span className="shrink-0 text-slate-600">ঠিকানা:</span><span className="line-clamp-2">{p.address}</span></div>
                <div className="flex gap-[5cqw]">
                  <span><span className="text-slate-600">রক্তের গ্রুপ / Blood Group: </span><b className="text-accent-600">{p.bloodGroup ?? "-"}</b></span>
                  <span><span className="text-slate-600">জন্মস্থান: </span>{p.birthPlace ?? "-"}</span>
                </div>
                <div><span className="text-slate-600">প্রদানের তারিখ: </span>{fmtCardDate(p.issuedAt)}</div>
              </div>
              <div className="mt-[2cqw]">
                <p className="text-[2.3cqw] font-semibold text-brand-800">{p.labels.replaces}</p>
                <div className="mt-[1cqw] flex flex-wrap gap-[1cqw]">
                  {p.programs.slice(0, 6).map((name) => (
                    <span key={name} className="rounded-full bg-brand-600/10 px-[1.6cqw] py-[0.3cqw] text-[2cqw] text-brand-800">{name}</span>
                  ))}
                </div>
              </div>
              <div className="mt-auto flex items-end gap-[3cqw]">
                <div className="flex-1"><Barcode seed={p.nid} /></div>
                <span className="pb-[0.5cqw] font-mono text-[2.2cqw] text-slate-600">{nidSpaced}</span>
              </div>
            </div>
            <Watermark />
          </div>
        </motion.div>
      </button>
      <p className="text-xs text-muted">{p.labels.flip}</p>
    </div>
  );
}
