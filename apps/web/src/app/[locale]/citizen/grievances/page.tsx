import { getTranslations } from "next-intl/server";
import { myGrievances } from "@ep/core";
import { formatDate } from "@ep/i18n";
import { Card, CardBody, CardHeader, EmptyState, Field, PageHeader, Select, Textarea } from "@ep/ui";
import { Stagger, StaggerItem } from "@ep/ui/motion";
import { ActionForm, SubmitButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { StatusBadge } from "@/components/status-badge";
import { submitGrievance } from "@/server/actions/citizen";
import { requirePortal } from "@/server/session";

const CATEGORIES = ["not_received", "wrong_amount", "exclusion", "corruption", "other"] as const;

export default async function Grievances({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("citizen");
  const [t, rows] = await Promise.all([getTranslations(), myGrievances(actor.nid!)]);
  return (
    <>
      <PageHeader title={t("citizen.grievanceTitle")} description={t("citizen.grievanceDesc")} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card className="self-start">
          <CardHeader title={t("citizen.grievanceTitle")} />
          <CardBody>
            <ActionForm action={submitGrievance} reset className="space-y-4">
              <Field label={t("citizen.category")} htmlFor="category">
                <Select id="category" name="category">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t(`citizen.categories.${c}`)}</option>)}
                </Select>
              </Field>
              <Field label={t("citizen.message")} htmlFor="message">
                <Textarea id="message" name="message" rows={5} minLength={10} maxLength={2000} required />
              </Field>
              <SubmitButton className="w-full">{t("citizen.fileGrievance")}</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
        <div>
          <h2 className="mb-3 font-semibold">{t("citizen.myGrievances")}</h2>
          {rows.length === 0 ? <EmptyState title={t("common.none")} /> : (
            <Stagger className="space-y-3">
              {rows.map((g) => (
                <StaggerItem key={g.id}>
                  <Card className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{t(`citizen.categories.${g.category}`)}</span>
                      <StatusBadge status={g.status} />
                    </div>
                    <p className="mt-2 text-sm text-ink">{g.message}</p>
                    {g.response && (
                      <div className="mt-3 rounded-lg border-l-4 border-brand-500 bg-brand-50 px-3 py-2 text-sm">
                        <span className="block text-xs font-semibold text-brand-700">{t("citizen.officialResponse")}</span>{g.response}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-muted">{formatDate(locale, g.createdAt, { dateStyle: "medium", timeStyle: "short" })}</p>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </div>
    </>
  );
}
