import { Check, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { enrollmentQueue } from "@ep/core";
import { divisionName, maskNid } from "@ep/domain";
import { formatDate, formatNumber, pickLocale } from "@ep/i18n";
import { Badge, Card, CardHeader, DataTable, PageHeader } from "@ep/ui";
import { ActionButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { decideEnrollmentAction } from "@/server/actions/officer";
import { requirePortal } from "@/server/session";

export default async function Queue({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("officer");
  const [t, rows] = await Promise.all([getTranslations(), enrollmentQueue(actor, "pending", 100)]);
  return (
    <>
      <PageHeader eyebrow={t("portals.officer.title")} title={t("officer.queueTitle")} description={t("officer.queueDesc")} />
      <Card>
        <CardHeader title={t("officer.queueTitle")} action={<Badge tone="amber">{formatNumber(locale, rows.length)}</Badge>} />
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("common.none")}
          columns={[
            { key: "name", header: t("common.name"), cell: (r) => (
              <div><div className="font-medium">{pickLocale(locale, r.nameBn, r.nameEn)}</div><div className="font-mono text-xs text-muted">{maskNid(r.nid)}</div></div>
            ) },
            { key: "program", header: t("common.program"), cell: (r) => pickLocale(locale, r.programBn, r.programEn) },
            { key: "division", header: t("common.division"), cell: (r) => divisionName(r.divisionCode, locale) },
            { key: "score", header: t("citizen.score"), cell: (r) => <span className="font-semibold text-brand-700">{formatNumber(locale, Math.round(r.score))}</span> },
            { key: "source", header: "", cell: (r) => <Badge tone="blue">{t(`officer.source.${r.source}`)}</Badge> },
            { key: "date", header: t("common.date"), cell: (r) => formatDate(locale, r.createdAt) },
            { key: "act", header: t("common.actions"), className: "text-right", cell: (r) => r.enrolledBy === actor.id
              ? <span className="text-xs text-muted">{t("errors.maker_checker")}</span>
              : (
                <div className="flex justify-end gap-2">
                  <ActionButton action={decideEnrollmentAction} fields={{ id: r.id, decision: "active" }} size="sm"><Check className="size-4" />{t("officer.approve")}</ActionButton>
                  <ActionButton action={decideEnrollmentAction} fields={{ id: r.id, decision: "rejected" }} size="sm" variant="danger"><X className="size-4" />{t("officer.reject")}</ActionButton>
                </div>
              ) },
          ]}
        />
      </Card>
    </>
  );
}
