"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Braces, Coins, GitBranch, Layers, Plus, Target, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  canonicalJson, defaultCondition, operatorsFor, RULE_FIELD_LIST, RULE_FIELDS, validateRuleSet,
  type Condition, type FieldMeta, type Operator, type RuleField, type RuleSet,
} from "@ep/domain";
import { formatMoney, formatNumber, type Locale } from "@ep/i18n";
import { cn, Input, Select } from "@ep/ui";
import type { RulePreviewResponse } from "@/lib/api-types";

/* ───────────── tree model (RuleSet + stable ids for React keys and animations) ───────────── */

type Mode = "all" | "any";
type CondNode = { id: string; kind: "cond"; field: RuleField; op: Operator; value: Condition["value"] };
type GroupNode = { id: string; kind: "group"; mode: Mode; children: Node[] };
type Node = CondNode | GroupNode;

let seq = 0;
const uid = () => `n${++seq}`;

const toTree = (r: RuleSet): GroupNode => {
  const mode: Mode = "all" in r ? "all" : "any";
  const items = "all" in r ? r.all : r.any;
  return {
    id: uid(), kind: "group", mode,
    children: items.map((n) => ("field" in n ? { id: uid(), kind: "cond", field: n.field as RuleField, op: n.op, value: n.value } : toTree(n))),
  };
};

const toRules = (g: GroupNode): RuleSet => {
  const items = g.children.map((n) => (n.kind === "cond" ? { field: n.field, op: n.op, value: n.value } : toRules(n)));
  return g.mode === "all" ? { all: items } : { any: items };
};

/** Immutable update of one node anywhere in the tree. Returning null removes it. */
const mapTree = (g: GroupNode, id: string, fn: (n: Node) => Node | null): GroupNode => ({
  ...g,
  children: g.children.flatMap((c) => {
    if (c.id === id) { const next = fn(c); return next ? [next] : []; }
    return c.kind === "group" ? [mapTree(c, id, fn)] : [c];
  }),
});

const useDebounced = <T,>(value: T, ms: number) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};

const MODE_STYLE: Record<Mode, { ring: string; chip: string; bar: string }> = {
  all: { ring: "border-brand-200 bg-brand-50/40", chip: "bg-brand-600 text-white", bar: "bg-brand-300" },
  any: { ring: "border-amber-200 bg-amber-50/40", chip: "bg-amber-500 text-white", bar: "bg-amber-300" },
};

/* ───────────── value inputs per field type ───────────── */

function ValueInput({ node, meta, onChange, readOnly }: { node: CondNode; meta: FieldMeta; onChange: (v: Condition["value"]) => void; readOnly: boolean }) {
  const t = useTranslations("rules");
  if (meta.type === "boolean") {
    return (
      <div className="flex h-10 rounded-lg bg-surface p-1" role="radiogroup">
        {[true, false].map((b) => (
          <button key={String(b)} type="button" role="radio" aria-checked={node.value === b} disabled={readOnly} onClick={() => onChange(b)}
            className={cn("flex-1 rounded-md px-3 text-sm font-semibold transition", node.value === b ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink")}>
            {b ? t("yes") : t("no")}
          </button>
        ))}
      </div>
    );
  }
  if (meta.type === "enum" && node.op === "in") {
    const selected = new Set((Array.isArray(node.value) ? node.value : [node.value]).map(String));
    return (
      <div className="flex flex-wrap gap-1.5">
        {meta.options!.map((o) => {
          const on = selected.has(o);
          return (
            <button key={o} type="button" disabled={readOnly} aria-pressed={on}
              onClick={() => {
                const next = new Set(selected);
                if (on) next.delete(o); else next.add(o);
                onChange([...next]);
              }}
              className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1 transition", on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-muted ring-line hover:ring-brand-300")}>
              {t(`options.${o}` as never)}
            </button>
          );
        })}
      </div>
    );
  }
  if (meta.type === "enum") {
    return (
      <Select value={String(node.value)} disabled={readOnly} onChange={(e) => onChange(e.target.value)} aria-label={t("value")}>
        {meta.options!.map((o) => <option key={o} value={o}>{t(`options.${o}` as never)}</option>)}
      </Select>
    );
  }
  return (
    <div className="relative">
      {meta.unit === "money" && <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">৳</span>}
      <Input type="number" inputMode="numeric" value={Number(node.value)} step={meta.step} min={meta.min} readOnly={readOnly}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={cn("tabular-nums", meta.unit === "money" && "pl-7", meta.unit && meta.unit !== "money" && "pr-16")} aria-label={t("value")} />
      {meta.unit && meta.unit !== "money" && (
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted">{t(`units.${meta.unit}`)}</span>
      )}
    </div>
  );
}

/* ───────────── condition row and group ───────────── */

function ConditionRow({ node, onUpdate, onRemove, readOnly }: { node: CondNode; onUpdate: (n: CondNode) => void; onRemove: () => void; readOnly: boolean }) {
  const t = useTranslations();
  const meta: FieldMeta = RULE_FIELDS[node.field];
  return (
    <div className="grid gap-2 rounded-xl border border-line bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.4fr)_auto] sm:items-center">
      <Select value={node.field} disabled={readOnly} aria-label={t("rules.field")}
        onChange={(e) => { const c = defaultCondition(e.target.value as RuleField); onUpdate({ ...node, field: c.field as RuleField, op: c.op, value: c.value }); }}>
        {RULE_FIELD_LIST.map((f) => <option key={f} value={f}>{t(`fields.${f}`)}</option>)}
      </Select>
      <Select value={node.op} disabled={readOnly || operatorsFor(node.field).length === 1} aria-label={t("rules.operator")}
        onChange={(e) => {
          const op = e.target.value as Operator;
          // Switching between single value and "one of" converts the value shape.
          const value = op === "in" ? [String(node.value)] : Array.isArray(node.value) ? String(node.value[0] ?? meta.options?.[0]) : node.value;
          onUpdate({ ...node, op, value });
        }}>
        {operatorsFor(node.field).map((o) => <option key={o} value={o}>{t(`rules.ops.${o}`)}</option>)}
      </Select>
      <ValueInput node={node} meta={meta} readOnly={readOnly} onChange={(value) => onUpdate({ ...node, value })} />
      {!readOnly && (
        <button type="button" onClick={onRemove} aria-label={t("rules.remove")} title={t("rules.remove")}
          className="grid size-9 place-items-center justify-self-end rounded-lg text-muted transition hover:bg-accent-50 hover:text-accent-600">
          <Trash2 className="size-4" />
        </button>
      )}
    </div>
  );
}

/** `onChange` always receives an updater for THIS group, so nesting composes without knowing the path. */
function Group({ node, depth, onChange, onRemove, readOnly }: {
  node: GroupNode; depth: number; onChange: (fn: (g: GroupNode) => GroupNode) => void; onRemove?: () => void; readOnly: boolean;
}) {
  const t = useTranslations("rules");
  const style = MODE_STYLE[node.mode];
  const update = (id: string, fn: (n: Node) => Node | null) => onChange((g) => mapTree(g, id, fn));

  return (
    <div className={cn("rounded-2xl border p-3 sm:p-4", style.ring)}>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative flex rounded-lg bg-white p-1 shadow-sm" role="radiogroup">
          {(["all", "any"] as const).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={node.mode === m} disabled={readOnly}
              onClick={() => onChange((g) => ({ ...g, mode: m }))}
              className={cn("relative rounded-md px-3 py-1.5 text-xs font-bold transition-colors", node.mode === m ? "text-white" : "text-muted hover:text-ink")}>
              {node.mode === m && <motion.span layoutId={`mode-${node.id}`} className={cn("absolute inset-0 rounded-md", MODE_STYLE[m].chip)} transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative">{t(m)}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{node.mode === "all" ? t("matchAll") : t("matchAny")}</p>
        {onRemove && !readOnly && (
          <button type="button" onClick={onRemove} className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent-600">
            <Trash2 className="size-3.5" />{t("removeGroup")}
          </button>
        )}
      </div>

      <ul className="space-y-0">
        <AnimatePresence initial={false}>
          {node.children.map((child, i) => (
            <motion.li key={child.id} layout initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}>
              {i > 0 && (
                <div className="flex items-center gap-2 py-1.5 pl-4">
                  <span className={cn("h-4 w-0.5 rounded", style.bar)} />
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider", style.chip)}>{node.mode === "all" ? t("and") : t("or")}</span>
                </div>
              )}
              {child.kind === "cond" ? (
                <ConditionRow node={child} readOnly={readOnly} onUpdate={(n) => update(child.id, () => n)} onRemove={() => update(child.id, () => null)} />
              ) : (
                <Group node={child} depth={depth + 1} readOnly={readOnly}
                  onChange={(fn) => update(child.id, (n) => fn(n as GroupNode))}
                  onRemove={() => update(child.id, () => null)} />
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {node.children.length === 0 && <p className="rounded-lg border border-dashed border-accent-100 bg-white px-3 py-3 text-xs text-accent-700">{t("emptyGroup")}</p>}

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onChange((g) => ({ ...g, children: [...g.children, { id: uid(), kind: "cond", ...defaultCondition() } as CondNode] }))} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-line transition hover:ring-brand-300">
            <Plus className="size-3.5" />{t("addCondition")}
          </button>
          {depth < 2 && (
            <button type="button" onClick={() => onChange((g) => ({
              ...g,
              children: [...g.children, { id: uid(), kind: "group", mode: g.mode === "all" ? "any" : "all", children: [{ id: uid(), kind: "cond", ...defaultCondition() } as CondNode] }],
            }))} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-white hover:text-ink">
              <Layers className="size-3.5" />{t("addGroup")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────── plain-language summary (shared by editor and read-only view) ───────────── */

export function RuleSummary({ rules }: { rules: RuleSet }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const valueText = (c: Condition): string => {
    const meta: FieldMeta | undefined = (RULE_FIELDS as Record<string, FieldMeta>)[c.field];
    if (typeof c.value === "boolean") return c.value ? t("rules.yes") : t("rules.no");
    if (Array.isArray(c.value)) return c.value.map((v) => t(`rules.options.${v}` as never)).join(" / ");
    if (meta?.type === "enum") return t(`rules.options.${c.value}` as never);
    if (meta?.unit === "money") return formatMoney(locale, Number(c.value));
    return `${formatNumber(locale, Number(c.value))}${meta?.unit ? ` ${t(`rules.units.${meta.unit}` as never)}` : ""}`;
  };
  const render = (r: RuleSet, nested: boolean): React.ReactNode => {
    const mode = "all" in r ? "all" : "any";
    const items = "all" in r ? r.all : r.any;
    return (
      <span className={cn(nested && "rounded-md bg-surface px-1 py-0.5 ring-1 ring-line")}>
        {nested && <span className="text-muted">(</span>}
        {items.map((n, i) => (
          <span key={i}>
            {i > 0 && <> <span className={cn("mx-0.5 text-[11px] font-bold", mode === "all" ? "text-brand-700" : "text-amber-700")}>{mode === "all" ? t("rules.and") : t("rules.or")}</span> </>}
            {"field" in n ? (
              <span className="whitespace-nowrap">
                <b className="font-semibold text-ink">{t(`fields.${n.field}`)}</b>{" "}
                <span className="text-muted">{t(`rules.ops.${n.op}`)}</span>{" "}
                <b className="font-semibold text-brand-800">{valueText(n)}</b>
              </span>
            ) : render(n, true)}
          </span>
        ))}
        {nested && <span className="text-muted">)</span>}
      </span>
    );
  };
  return <p className="text-sm leading-7">{render(rules, false)}</p>;
}

/* ───────────── live impact preview ───────────── */

function ImpactPreview({ rules, valid, povertyTargeted, amount }: { rules: RuleSet; valid: boolean; povertyTargeted: boolean; amount: number }) {
  const t = useTranslations("rules");
  const locale = useLocale() as Locale;
  const debounced = useDebounced(JSON.stringify(rules), 450);
  const q = useQuery({
    queryKey: ["rule-preview", debounced, povertyTargeted],
    enabled: valid,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<RulePreviewResponse> => {
      const res = await fetch("/api/v1/programs/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules: JSON.parse(debounced), povertyTargeted }),
      });
      if (!res.ok) throw new Error("preview_failed");
      return res.json();
    },
  });
  const d = q.data;
  const stats = d ? [
    { icon: Users, value: formatNumber(locale, d.eligible), label: t("previewEligible"), tone: "text-brand-700" },
    { icon: Coins, value: formatMoney(locale, d.eligible * amount), label: t("previewCost"), tone: "text-ink" },
    { icon: Target, value: `${formatNumber(locale, d.poorestSharePct)}%`, label: t("previewPoorest"), tone: d.poorestSharePct >= 60 ? "text-brand-700" : "text-accent-600" },
    { icon: GitBranch, value: `${formatNumber(locale, d.poorReachedPct)}%`, label: t("previewReach"), tone: "text-ink" },
  ] : [];

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex size-2.5">
          {q.isFetching && <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />}
          <span className="relative inline-flex size-2.5 rounded-full bg-brand-500" />
        </span>
        <h4 className="text-sm font-semibold">{t("previewTitle")}</h4>
      </div>
      {!valid ? <p className="text-xs text-accent-700">{t("previewInvalid")}</p> : (
        <>
          <div className={cn("grid grid-cols-2 gap-3 transition-opacity lg:grid-cols-4", q.isFetching && "opacity-60")}>
            {d ? stats.map(({ icon: Icon, value, label, tone }) => (
              <div key={label} className="rounded-xl bg-surface p-3">
                <Icon className="mb-1.5 size-4 text-muted" />
                <motion.div key={value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={cn("text-lg font-bold tabular-nums", tone)}>{value}</motion.div>
                <div className="text-[11px] leading-tight text-muted">{label}</div>
              </div>
            )) : Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[86px] animate-pulse rounded-xl bg-surface" />)}
          </div>
          {d && <p className="mt-2 text-[11px] text-muted">{t("previewScanned", { count: formatNumber(locale, d.scanned) })}</p>}
        </>
      )}
    </div>
  );
}

/* ───────────── public component ───────────── */

/**
 * Visual eligibility-rule editor. It serialises to the same RuleSet JSON as before (hidden `name` input),
 * so the server action and core validation are unchanged. Read-only roles see the same tree, disabled.
 */
export function RuleBuilder({ initial, name, readOnly, povertyTargeted, amount }: {
  initial: RuleSet; name: string; readOnly: boolean; povertyTargeted: boolean; amount: number;
}) {
  const t = useTranslations("rules");
  const [tree, setTree] = useState(() => toTree(initial));
  const [showJson, setShowJson] = useState(false);
  const rules = useMemo(() => toRules(tree), [tree]);
  const json = useMemo(() => JSON.stringify(rules), [rules]);
  const valid = useMemo(() => validateRuleSet(rules).length === 0, [rules]);
  // Canonical comparison: jsonb reorders keys, so plain string equality would report false "unsaved changes".
  const dirty = useMemo(() => canonicalJson(rules) !== canonicalJson(initial), [rules, initial]);

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={json} />
      <Group node={tree} depth={0} readOnly={readOnly} onChange={(fn) => setTree((g) => fn(g))} />

      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h4 className="text-xs font-semibold tracking-wide text-muted uppercase">{t("summaryTitle")}</h4>
          <div className="flex items-center gap-3">
            <AnimatePresence>
              {dirty && (
                <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="rounded-full bg-gold-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{t("unsaved")}</motion.span>
              )}
            </AnimatePresence>
            <button type="button" onClick={() => setShowJson((s) => !s)} className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink">
              <Braces className="size-3.5" />{showJson ? t("hideJson") : t("showJson")}
            </button>
          </div>
        </div>
        <RuleSummary rules={rules} />
        <AnimatePresence>
          {showJson && (
            <motion.pre initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden rounded-lg bg-brand-950 p-3 text-[11px] leading-relaxed text-brand-100">
              {JSON.stringify(rules, null, 2)}
            </motion.pre>
          )}
        </AnimatePresence>
      </div>

      <ImpactPreview rules={rules} valid={valid} povertyTargeted={povertyTargeted} amount={amount} />
    </div>
  );
}
