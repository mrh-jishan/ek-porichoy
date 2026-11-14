import { getTranslations } from "next-intl/server";
import { paymentHistory } from "@ep/core";
import { maskAccount } from "@ep/domain";
import { formatDate, formatMoney, formatPeriod, pickLocale } from "@ep/i18n";
import { Card, CardHeader, DataTable, PageHeader, StatCard } from "@ep/ui";
import { AnimatedNumber } from "@ep/ui/motion";
import { HandCoins } from "lucide-react";
import type { PageProps } from "@/components/portal-layout";
import { StatusBadge } from "@/components/status-badge";
import { requirePortal } from "@/server/session";

export default async function Payments({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("citizen");
  const [t, rows] = await Promise.all([getTranslations(), paymentHistory(actor.nid!)]);
  const total = rows.filter((r) => r.d.status === "paid").reduce((s, r) => s + r.d.amount, 0);
  return (
    <>
      <PageHeader title={t("citizen.paymentsTitle")} />
      <StatCard className="mb-6 max-w-sm" label={t("admin.kpi.paid")} icon={<HandCoins className="size-5" />} value={<AnimatedNumber value={total} locale={locale} style="money" />} />
      <Card>
        <CardHeader title={t("citizen.paymentsTitle")} />
        <DataTable
          rows={rows}
          rowKey={(r) => r.d.id}
          empty={t("citizen.noPayments")}
          columns={[
            { key: "period", header: t("officer.period"), cell: (r) => formatPeriod(locale, r.d.period) },
            { key: "program", header: t("common.program"), cell: (r) => pickLocale(locale, r.programBn, r.programEn) },
            { key: "amount", header: t("common.amount"), cell: (r) => <span className="font-semibold">{formatMoney(locale, r.d.amount)}</span> },
            { key: "channel", header: t("payer.account"), cell: (r) => `${t(`providers.${r.d.provider as "bkash"}`)} ${maskAccount(r.d.accountNumber)}` },
            { key: "ref", header: t("payer.txnRef"), cell: (r) => <span className="font-mono text-xs">{r.d.txnRef ?? "-"}</span> },
            { key: "date", header: t("common.date"), cell: (r) => (r.d.paidAt ? formatDate(locale, r.d.paidAt) : "-") },
            { key: "status", header: t("common.status"), cell: (r) => <StatusBadge status={r.d.status} /> },
          ]}
        />
      </Card>
    </>
  );
}
