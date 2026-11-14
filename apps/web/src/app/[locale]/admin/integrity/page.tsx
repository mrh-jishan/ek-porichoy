import { Radar } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listFlags } from "@ep/core";
import { can, divisionName, maskNid } from "@ep/domain";
import { formatDate, pickLocale } from "@ep/i18n";
import { Card, CardHeader, cn, DataTable, PageHeader } from "@ep/ui";
import { ActionButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { SeverityBadge, StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";
import { resolveFlagAction, runScanAction } from "@/server/actions/admin";
import { requirePortal } from "@/server/session";

const FILTERS = ["open", "confirmed", "dismissed"] as const;

export default async function Integrity({ params, searchParams }: PageProps) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const { actor } = await requirePortal("admin");
  const status = FILTERS.find((f) => f === sp.status) ?? "open";
  const [t, rows] = await Promise.all([getTranslations(), listFlags(actor, { status, limit: 200 })]);
  const canResolve = can(actor.role, "flag", "resolve");

  return (
    <>
      <PageHeader
        eyebrow={t("portals.admin.title")}
        title={t("admin.integrityTitle")}
        description={t("admin.integrityDesc")}
        actions={can(actor.role, "flag", "scan") && (
          <ActionButton action={runScanAction} fields={{}} successKey="admin.scanResult" variant="accent"><Radar className="size-4" />{t("admin.runScan")}</ActionButton>
        )}
      />
      <Card>
        <CardHeader
          title={t("admin.integrityTitle")}
          action={
            <nav className="flex gap-1 rounded-lg bg-surface p-1" aria-label={t("common.status")}>
              {FILTERS.map((f) => (
                <Link key={f} href={`/admin/integrity?status=${f}`} aria-current={f === status ? "page" : undefined}
                  className={cn("rounded-md px-3 py-1 text-sm font-medium transition", f === status ? "bg-white text-brand-700 shadow-sm" : "text-muted hover:text-ink")}>
                  {t(`status.${f}`)}
                </Link>
              ))}
            </nav>
          }
        />
        <DataTable
          rows={rows}
          rowKey={(r) => r.flag.id}
          empty={t("common.none")}
          columns={[
            { key: "sev", header: "", cell: (r) => <SeverityBadge severity={r.flag.severity} /> },
            { key: "type", header: t("common.status"), cell: (r) => <span className="font-medium">{t(`flags.${r.flag.type as "deceased_recipient"}`)}</span> },
            { key: "who", header: t("common.name"), cell: (r) => <div><div>{pickLocale(locale, r.nameBn, r.nameEn)}</div><div className="font-mono text-xs text-muted">{maskNid(r.flag.nid)}</div></div> },
            { key: "div", header: t("common.division"), cell: (r) => divisionName(r.divisionCode, locale) },
            { key: "detail", header: "", cell: (r) => <code className="text-xs text-muted">{Object.entries(r.flag.detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join("+") : String(v)}`).join(" · ")}</code> },
            { key: "date", header: t("common.date"), cell: (r) => formatDate(locale, r.flag.createdAt) },
            { key: "act", header: "", className: "text-right", cell: (r) => r.flag.status === "open" && canResolve ? (
              <div className="flex justify-end gap-2">
                <ActionButton action={resolveFlagAction} fields={{ id: r.flag.id, decision: "confirmed" }} size="sm" variant="accent">{t("admin.confirm")}</ActionButton>
                <ActionButton action={resolveFlagAction} fields={{ id: r.flag.id, decision: "dismissed" }} size="sm" variant="outline">{t("admin.dismiss")}</ActionButton>
              </div>
            ) : <StatusBadge status={r.flag.status} /> },
          ]}
        />
      </Card>
    </>
  );
}
