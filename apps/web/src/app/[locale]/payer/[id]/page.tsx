import { CheckCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getBatch } from "@ep/core";
import { maskAccount, maskNid } from "@ep/domain";
import { formatMoney, formatNumber, formatPeriod, pickLocale } from "@ep/i18n";
import { Card, CardBody, CardHeader, DataTable, DefinitionList, Input, PageHeader } from "@ep/ui";
import { ActionButton, ActionForm, SubmitButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";
import { failDisbursementAction, settleBatchAction } from "@/server/actions/payer";
import { requirePortal } from "@/server/session";

export default async function BatchDetail({ params }: PageProps<{ id: string }>) {
  const { locale, id } = await params;
  const { actor } = await requirePortal("payer");
  const [t, data] = await Promise.all([getTranslations(), getBatch(actor, id)]);
  const { batch, items } = data;
  const open = batch.status === "sent";

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/payer" className="hover:underline">← {t("common.back")}</Link>}
        title={`${pickLocale(locale, data.programBn, data.programEn)} · ${formatPeriod(locale, batch.period)}`}
        actions={open && (
          <ActionButton action={settleBatchAction} fields={{ batchId: batch.id }} size="lg"><CheckCheck className="size-4" />{t("payer.settle")}</ActionButton>
        )}
      />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="self-start">
          <CardHeader title={<StatusBadge status={batch.status} />} description={open ? t("payer.settleDesc") : undefined} />
          <CardBody>
            <DefinitionList items={[
              { term: t("payer.items"), detail: formatNumber(locale, batch.itemCount) },
              { term: t("common.total"), detail: formatMoney(locale, batch.totalAmount) },
              { term: t("payer.account"), detail: t(`providers.${batch.provider}`) },
            ]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t("payer.items")} />
          <DataTable
            rows={items}
            rowKey={(r) => r.d.id}
            columns={[
              { key: "who", header: t("payer.recipient"), cell: (r) => <div><div className="font-medium">{pickLocale(locale, r.nameBn, r.nameEn)}</div><div className="font-mono text-xs text-muted">{maskNid(r.d.nid)}</div></div> },
              { key: "acct", header: t("payer.account"), cell: (r) => <span className="font-mono">{maskAccount(r.d.accountNumber)}</span> },
              { key: "amt", header: t("common.amount"), cell: (r) => formatMoney(locale, r.d.amount) },
              { key: "ref", header: t("payer.txnRef"), cell: (r) => <span className="font-mono text-xs">{r.d.txnRef ?? r.d.failureReason ?? "—"}</span> },
              { key: "st", header: t("common.status"), cell: (r) => <StatusBadge status={r.d.status} /> },
              { key: "act", header: "", className: "text-right", cell: (r) => open && r.d.status === "sent" ? (
                <ActionForm action={failDisbursementAction} className="flex justify-end gap-2">
                  <input type="hidden" name="id" value={r.d.id} />
                  <Input name="reason" required minLength={3} placeholder={t("payer.failureReason")} className="h-8 w-36 text-xs" aria-label={t("payer.failureReason")} />
                  <SubmitButton size="sm" variant="danger">{t("payer.markFailed")}</SubmitButton>
                </ActionForm>
              ) : null },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
