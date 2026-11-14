import { Banknote, Clock, Code2, ListChecks } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listBatches } from "@ep/core";
import { Card, CardBody, CardHeader, PageHeader, StatCard } from "@ep/ui";
import { AnimatedNumber, FadeIn } from "@ep/ui/motion";
import type { PageProps } from "@/components/portal-layout";
import { requirePortal } from "@/server/session";
import { BatchTable } from "./batch-table";

export default async function PayerHome({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("payer");
  const [t, rows] = await Promise.all([getTranslations(), listBatches(actor, 100)]);
  const open = rows.filter((r) => r.batch.status === "sent");
  const settled = rows.filter((r) => r.batch.status === "settled").reduce((s, r) => s + r.batch.totalAmount, 0);

  return (
    <>
      <PageHeader eyebrow={t(`providers.${actor.payerOrg as "bkash"}`)} title={t("payer.title")} description={t("payer.desc")} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label={t("status.sent")} icon={<Clock className="size-5" />} tone="gold" value={<AnimatedNumber value={open.length} locale={locale} />} />
        <StatCard label={t("payer.items")} icon={<ListChecks className="size-5" />} value={<AnimatedNumber value={open.reduce((s, r) => s + r.batch.itemCount, 0)} locale={locale} />} />
        <StatCard label={t("status.settled")} icon={<Banknote className="size-5" />} value={<AnimatedNumber value={settled} locale={locale} style="crore" />} />
      </div>
      <Card>
        <CardHeader title={t("payer.title")} />
        <BatchTable rows={rows} locale={locale} href={(id) => `/payer/${id}`} />
      </Card>
      <FadeIn className="mt-6">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Code2 className="size-4 text-brand-600" />{t("payer.apiTitle")}</span>} description={t("payer.apiDesc")} />
          <CardBody>
            <pre className="overflow-x-auto rounded-lg bg-brand-950 p-4 text-xs leading-relaxed text-brand-100">{`POST /api/v1/payer/settlements
X-EP-Timestamp: 1763100000
X-EP-Signature: hex(HMAC_SHA256(secret, timestamp + "." + body))

{ "batchId": "…", "payerOrg": "${actor.payerOrg}",
  "results": [{ "id": "…", "status": "failed", "failureReason": "Wallet inactive" }] }`}</pre>
          </CardBody>
        </Card>
      </FadeIn>
    </>
  );
}
