"use client";
import * as Popover from "@radix-ui/react-popover";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { bn, enUS } from "react-day-picker/locale";
import { cn } from "../cn";

type Lang = "bn" | "en";

/* ───────────── shared helpers ───────────── */

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const toLatinDigits = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const toLocaleDigits = (s: string, lang: Lang) => (lang === "bn" ? s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!) : s);
const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso: string): Date | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 ? d : undefined;
};
const intl = (lang: Lang) => (lang === "bn" ? "bn-BD" : "en-GB");

const triggerBox =
  "flex h-10 w-full items-center rounded-lg border border-line bg-white text-sm text-ink transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 aria-[invalid=true]:border-accent-500";
const popoverBox =
  "z-50 animate-pop-in rounded-2xl border border-line bg-white p-3 shadow-lift outline-none";
const iconBtn = "grid size-8 place-items-center rounded-lg text-muted transition hover:bg-brand-50 hover:text-brand-700";

/* ───────────── DatePicker ───────────── */

export interface DatePickerLabels {
  open: string;
  clear: string;
  placeholder: string; // e.g. DD/MM/YYYY
}

export interface DatePickerProps {
  id?: string;
  /** Form field name; the hidden input carries an ISO yyyy-mm-dd value. */
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  lang: Lang;
  labels: DatePickerLabels;
  min?: string;
  max?: string;
  /** Month shown when the calendar opens with nothing selected (e.g. 1980-01-01 for birth dates). */
  defaultMonth?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Date field that is fast to type (DD/MM/YYYY, Bangla or Latin digits) AND has a full calendar
 * with month/year dropdowns, so a 1956 birth date is two clicks, not 800 arrow presses.
 */
export function DatePicker({
  id, name, value, defaultValue, onChange, lang, labels, min = "1900-01-01", max, defaultMonth, required, disabled, className,
}: DatePickerProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const iso = controlled ? value : inner;
  const selected = fromIso(iso);
  const minD = fromIso(min)!, maxD = max ? fromIso(max)! : new Date(new Date().getFullYear() + 10, 11, 31);

  const display = (d?: Date) => (d ? toLocaleDigits(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`, lang) : "");
  const [text, setText] = useState(display(selected));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(selected ?? fromIso(defaultMonth ?? "") ?? maxD);

  // Keep the text box in sync when the value changes from outside (calendar pick, parent reset).
  useEffect(() => { setText(display(fromIso(iso))); setInvalid(false); }, [iso, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (next: string) => { if (!controlled) setInner(next); onChange?.(next); };

  const onType = (raw: string) => {
    const digits = toLatinDigits(raw).replace(/\D/g, "").slice(0, 8);
    const masked = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean).join("/");
    setText(toLocaleDigits(masked, lang));
    if (digits.length < 8) { setInvalid(false); if (iso) commit(""); return; }
    const d = fromIso(`${digits.slice(4, 8)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`);
    const ok = !!d && d >= minD && d <= maxD;
    setInvalid(!ok);
    if (ok) { commit(toIso(d)); setMonth(d); } else if (iso) commit("");
  };

  const longLabel = selected ? new Intl.DateTimeFormat(intl(lang), { dateStyle: "full" }).format(selected) : undefined;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn(triggerBox, disabled && "bg-surface opacity-70", className)} aria-invalid={invalid}>
        {name && <input type="hidden" name={name} value={iso} />}
        <input
          id={inputId}
          value={text}
          onChange={(e) => onType(e.target.value)}
          placeholder={toLocaleDigits(labels.placeholder, lang)}
          inputMode="numeric"
          autoComplete="bday"
          required={required}
          disabled={disabled}
          aria-invalid={invalid}
          aria-description={longLabel}
          className="h-full min-w-0 flex-1 rounded-l-lg bg-transparent px-3 font-medium tracking-wide tabular-nums outline-none placeholder:font-normal placeholder:text-muted/70"
        />
        {iso && !required && !disabled && (
          <button type="button" onClick={() => commit("")} className={iconBtn} aria-label={labels.clear}><X className="size-3.5" /></button>
        )}
        <Popover.Trigger asChild disabled={disabled}>
          <button type="button" className={cn(iconBtn, "mr-1 text-brand-700")} aria-label={labels.open}>
            <CalendarDays className="size-4.5" />
          </button>
        </Popover.Trigger>
      </div>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className={popoverBox} collisionPadding={12}>
          <DayPicker
            mode="single"
            required={required as never}
            selected={selected}
            onSelect={(d: Date | undefined) => { commit(d ? toIso(d) : ""); if (d) setOpen(false); }}
            month={month}
            onMonthChange={setMonth}
            captionLayout="dropdown"
            reverseYears
            startMonth={minD}
            endMonth={maxD}
            disabled={[{ before: minD }, { after: maxD }]}
            locale={lang === "bn" ? bn : enUS}
            numerals={lang === "bn" ? "beng" : "latn"}
            weekStartsOn={6}
            autoFocus
            classNames={dayPickerClassNames}
          />
          {longLabel && <p className="mt-2 border-t border-line pt-2 text-center text-xs text-muted">{longLabel}</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Tailwind styling for react-day-picker (no external stylesheet needed). */
const dayPickerClassNames = {
  root: "relative w-[18.5rem] select-none",
  months: "relative",
  month: "space-y-2",
  month_caption: "flex h-9 items-center pr-20",
  caption_label: "flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-ink [&>svg]:size-3.5 [&>svg]:fill-muted",
  dropdowns: "flex items-center gap-1",
  dropdown_root: "relative inline-flex items-center rounded-md hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-300",
  dropdown: "absolute inset-0 w-full cursor-pointer opacity-0",
  nav: "absolute top-0 right-0 z-10 flex items-center gap-1",
  button_previous: iconBtn + " disabled:opacity-30",
  button_next: iconBtn + " disabled:opacity-30",
  chevron: "size-4 fill-current",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday: "flex-1 pb-1 text-center text-[11px] font-semibold text-muted",
  week: "mt-0.5 flex",
  day: "flex-1 p-0.5 text-center",
  day_button:
    "mx-auto grid size-9 place-items-center rounded-lg text-sm tabular-nums transition hover:bg-brand-50 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-brand-600",
  selected: "[&>button]:bg-brand-600 [&>button]:font-semibold [&>button]:text-white [&>button]:shadow-sm [&>button:hover]:bg-brand-700 [&>button:hover]:text-white",
  today: "[&>button]:ring-1 [&>button]:ring-accent-400 [&>button]:font-semibold",
  outside: "opacity-35",
  disabled: "pointer-events-none opacity-25",
  hidden: "invisible",
};

/* ───────────── MonthPicker ───────────── */

export interface MonthPickerLabels {
  open: string;
  prevYear: string;
  nextYear: string;
}

/** Month + year selector for billing periods. Hidden input carries "YYYY-MM". */
export function MonthPicker({ id, name, defaultValue, value, onChange, lang, labels, className }: {
  id?: string; name?: string; defaultValue?: string; value?: string; onChange?: (period: string) => void;
  lang: Lang; labels: MonthPickerLabels; className?: string;
}) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const period = controlled ? value : inner;
  const [y, m] = period ? period.split("-").map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
  const [year, setYear] = useState(y!);
  const [open, setOpen] = useState(false);
  const now = new Date();
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(intl(lang), { month: "short" }).format(new Date(2000, i, 15))),
    [lang],
  );
  const label = period ? new Intl.DateTimeFormat(intl(lang), { month: "long", year: "numeric" }).format(new Date(y!, m! - 1, 15)) : "";
  const pick = (mi: number) => {
    const next = `${year}-${pad(mi + 1)}`;
    if (!controlled) setInner(next);
    onChange?.(next);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (o) setYear(y!); }}>
      {name && <input type="hidden" name={name} value={period} />}
      <Popover.Trigger asChild>
        <button id={id} type="button" aria-label={labels.open} className={cn(triggerBox, "justify-between px-3 text-left font-medium hover:border-brand-300", className)}>
          <span>{label}</span>
          <CalendarDays className="size-4.5 text-brand-700" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className={cn(popoverBox, "w-64")} collisionPadding={12}>
          <div className="mb-2 flex items-center justify-between">
            <button type="button" className={iconBtn} onClick={() => setYear((v) => v - 1)} aria-label={labels.prevYear}><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-bold tabular-nums">{toLocaleDigits(String(year), lang)}</span>
            <button type="button" className={iconBtn} onClick={() => setYear((v) => v + 1)} aria-label={labels.nextYear}><ChevronRight className="size-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1.5" role="listbox">
            {months.map((name, i) => {
              const isSelected = year === y && i + 1 === m;
              const isCurrent = year === now.getFullYear() && i === now.getMonth();
              return (
                <button key={i} type="button" role="option" aria-selected={isSelected} onClick={() => pick(i)}
                  className={cn(
                    "rounded-lg py-2 text-sm font-medium transition",
                    isSelected ? "bg-brand-600 text-white shadow-sm" : "hover:bg-brand-50 hover:text-brand-800",
                    isCurrent && !isSelected && "ring-1 ring-accent-400",
                  )}>
                  {name}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
