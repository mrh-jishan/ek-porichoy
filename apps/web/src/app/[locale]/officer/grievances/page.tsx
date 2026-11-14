import { getTranslations } from "next-intl/server";
import { listGrievances } from "@ep/core";
import { divisionName, maskNid } from "@ep/domain";
import { formatDate, pickLocale } from "@ep/i18n";
import { Badge, Card, Input, PageHeader } from "@ep/ui";
import { Stagger, StaggerItem } from "@ep/ui/motion";
import { ActionForm, SubmitButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { StatusBadge } from "@/components/status-badge";
import { respondGrievanceAction } from "@/server/actions/officer";
import { requirePortal } from "@/server/session";

export default async function OfficerGrievances({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("officer");
  const [t, rows] = await Promise.all([getTranslations(), listGrievances(actor)]);
  return (
    <>
      <PageHeader eyebrow={t("portals.officer.title")} title={t("officer.grievancesTitle")} description={t("citizen.grievanceDesc")} />
      <Stagger className="space-y-3">
        {rows.map(({ g, nameBn, nameEn, divisionCode }) => (
          <StaggerItem key={g.id}>
            <Card className={`p-4 ${g.category === "corruption" ? "border-l-4 border-l-accent-500" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{pickLocale(locale, nameBn, nameEn)}</span>
                  <span className="font-mono text-xs text-muted">{maskNid(g.nid)}</span>
                  <Badge tone={g.category === "corruption" ? "red" : "neutral"}>{t(`citizen.categories.${g.category}`)}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  {divisionName(divisionCode, locale)} · {formatDate(locale, g.createdAt)} <StatusBadge status={g.status} />
                </div>
              </div>
              <p className="mt-2 text-sm">{g.message}</p>
              {g.response && <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">{g.response}</p>}
              {g.status !== "resolved" && (
                <ActionForm action={respondGrievanceAction} reset className="mt-3 flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <Input name="response" placeholder={t("officer.response")} required minLength={2} className="min-w-60 flex-1" aria-label={t("officer.response")} />
                  <SubmitButton name="status" value="in_review" variant="outline" size="md">{t("officer.markReview")}</SubmitButton>
                  <SubmitButton name="status" value="resolved" size="md">{t("officer.markResolved")}</SubmitButton>
                </ActionForm>
              )}
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}
