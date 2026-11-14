import { getTranslations } from "next-intl/server";
import type { listBatches } from "@ep/core";
import { formatDate, formatMoney, formatNumber, formatPeriod, pickLocale, type Locale } from "@ep/i18n";
import { DataTable, type Column } from "@ep/ui";
import type { ReactNode } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";

type Row = Awaited<ReturnType<typeof listBatches>>[number];

/** Shared by the payer portal and the admin disbursement-control page (DRY); callers add an actions column. */
export async function BatchTable({ rows, locale, href, actions }: { rows: Row[]; locale: Locale; href?: (id: string) => string; actions?: (row: Row) => ReactNode }) {
  const t = await getTranslations();
  const columns: Column<Row>[] = [
    { key: "program", header: t("common.program"), cell: (r) => {
      const label = <span className="font-medium">{pickLocale(locale, r.programBn, r.programEn)}</span>;
      return href ? <Link href={href(r.batch.id)} className="text-brand-700 hover:underline">{label}</Link> : label;
    } },
    { key: "period", header: t("officer.period"), cell: (r) => formatPeriod(locale, r.batch.period) },
    { key: "provider", header: t("payer.account"), cell: (r) => t(`providers.${r.batch.provider}`) },
    { key: "items", header: t("payer.items"), cell: (r) => formatNumber(locale, r.batch.itemCount) },
    { key: "amount", header: t("common.amount"), cell: (r) => <span className="font-semibold">{formatMoney(locale, r.batch.totalAmount)}</span> },
    { key: "date", header: t("common.date"), cell: (r) => formatDate(locale, r.batch.createdAt) },
    { key: "status", header: t("common.status"), cell: (r) => <StatusBadge status={r.batch.status} /> },
  ];
  if (actions) columns.push({ key: "actions", header: t("common.actions"), className: "text-right", cell: actions });
  return <DataTable rows={rows} rowKey={(r) => r.batch.id} columns={columns} empty={t("common.none")} />;
}
