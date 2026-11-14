import { ne } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db, user } from "@ep/db";
import { can, divisionName, type Role } from "@ep/domain";
import { formatDate } from "@ep/i18n";
import { Badge, Card, CardHeader, DataTable, PageHeader } from "@ep/ui";
import { ActionButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { setBanAction } from "@/server/actions/admin";
import { redirect } from "@/i18n/navigation";
import { requirePortal } from "@/server/session";

export default async function Users({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("admin");
  if (!can(actor.role, "identity", "manage")) return redirect({ href: "/forbidden", locale });
  const [t, rows] = await Promise.all([
    getTranslations(),
    db.select().from(user).where(ne(user.role, "citizen")).orderBy(user.role, user.email),
  ]);
  return (
    <>
      <PageHeader eyebrow={t("portals.admin.title")} title={t("admin.usersTitle")} description={t("admin.usersDesc")} />
      <Card>
        <CardHeader title={t("nav.users")} />
        <DataTable
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "name", header: t("common.name"), cell: (r) => <div><div className="font-medium">{r.name}</div><div className="text-xs text-muted">{r.email}</div></div> },
            { key: "role", header: "", cell: (r) => <Badge tone="green">{t(`roles.${r.role as Role}`)}</Badge> },
            { key: "scope", header: t("admin.scope"), cell: (r) => r.payerOrg ? t(`providers.${r.payerOrg as "bkash"}`) : r.jurisdiction ? divisionName(r.jurisdiction, locale) : t("officer.noJurisdiction") },
            { key: "created", header: t("common.date"), cell: (r) => formatDate(locale, r.createdAt) },
            { key: "status", header: t("common.status"), cell: (r) => r.banned ? <Badge tone="red">{t("admin.banned")}</Badge> : <Badge tone="green">{t("status.active")}</Badge> },
            { key: "act", header: "", className: "text-right", cell: (r) => r.id === actor.id ? null : (
              <ActionButton action={setBanAction} fields={{ userId: r.id, banned: r.banned ? "false" : "true" }} size="sm" variant={r.banned ? "outline" : "danger"}>
                {r.banned ? t("admin.unban") : t("admin.ban")}
              </ActionButton>
            ) },
          ]}
        />
      </Card>
    </>
  );
}
