import { getTranslations } from "next-intl/server";
import { listBatches } from "@ep/core";
import { nextStatuses } from "@ep/domain";
import { Card, CardHeader, PageHeader } from "@ep/ui";
import { ActionButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { transitionBatchAction } from "@/server/actions/admin";
import { requirePortal } from "@/server/session";
import { BatchTable } from "../../payer/batch-table";

const LABEL = { approved: "admin.approve", sent: "admin.dispatch", cancelled: "admin.cancel" } as const;

export default async function AdminBatches({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("admin");
  const [t, rows] = await Promise.all([getTranslations(), listBatches(actor, 200)]);

  return (
    <>
      <PageHeader eyebrow={t("portals.admin.title")} title={t("admin.batchesTitle")} description={t("admin.batchesDesc")} />
      <Card>
        <CardHeader title={t("nav.batches")} />
        <BatchTable
          rows={rows}
          locale={locale}
          actions={(r) => {
            // Allowed moves come from the domain state machine; maker–checker hides "approve" from the batch creator.
            const moves = nextStatuses(r.batch.status, actor.role)
              .filter((s): s is keyof typeof LABEL => s in LABEL)
              .filter((s) => !(s === "approved" && r.batch.createdBy === actor.id));
            return (
              <div className="flex justify-end gap-2">
                {moves.map((to) => (
                  <ActionButton key={to} action={transitionBatchAction} fields={{ id: r.batch.id, to }} size="sm" variant={to === "cancelled" ? "danger" : "primary"}>
                    {t(LABEL[to])}
                  </ActionButton>
                ))}
              </div>
            );
          }}
        />
      </Card>
    </>
  );
}
