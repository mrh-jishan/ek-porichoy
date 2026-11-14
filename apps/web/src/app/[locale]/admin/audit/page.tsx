import { getTranslations } from "next-intl/server";
import { listAudit } from "@ep/core";
import { formatDate, formatNumber } from "@ep/i18n";
import { Badge, Card, CardHeader, DataTable, PageHeader } from "@ep/ui";
import type { PageProps } from "@/components/portal-layout";
import { requirePortal } from "@/server/session";
import { VerifyChain } from "./verify-chain";

export default async function Audit({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("admin");
  const [t, rows] = await Promise.all([getTranslations(), listAudit(actor, 150)]);
  return (
    <>
      <PageHeader eyebrow={t("portals.admin.title")} title={t("admin.auditTitle")} description={t("admin.auditDesc")} actions={<VerifyChain />} />
      <Card>
        <CardHeader title={t("nav.audit")} />
        <DataTable
          rows={rows}
          rowKey={(r) => String(r.seq)}
          columns={[
            { key: "seq", header: "#", cell: (r) => <span className="font-mono text-xs text-muted">{formatNumber(locale, r.seq)}</span> },
            { key: "at", header: t("common.date"), cell: (r) => <span className="whitespace-nowrap">{formatDate(locale, r.at, { dateStyle: "short", timeStyle: "medium" })}</span> },
            { key: "action", header: t("common.actions"), cell: (r) => <Badge tone={r.action.includes("reject") || r.action.includes("confirmed") || r.action.includes("suspend") ? "red" : "green"}>{r.action}</Badge> },
            { key: "role", header: "", cell: (r) => r.actorRole ? <span className="text-xs text-muted">{t(`roles.${r.actorRole as "auditor"}`)}</span> : null },
            { key: "entity", header: "", cell: (r) => <span className="font-mono text-xs">{r.entity}{r.entityId ? `:${r.entityId.slice(0, 8)}` : ""}</span> },
            { key: "hash", header: "SHA-256", cell: (r) => <span className="font-mono text-[11px] text-muted" title={r.hash}>{r.prevHash.slice(0, 6)}→{r.hash.slice(0, 10)}</span> },
          ]}
        />
      </Card>
    </>
  );
}
