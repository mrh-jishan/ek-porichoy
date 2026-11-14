import { ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listPrograms } from "@ep/core";
import { can, periodOf } from "@ep/domain";
import { formatCrore, formatMoney, pickLocale } from "@ep/i18n";
import { Badge, Card, CardBody, CardHeader, Field, Input, PageHeader, Textarea } from "@ep/ui";
import { Stagger, StaggerItem } from "@ep/ui/motion";
import { ActionForm, SubmitButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { generateBatchesAction, updateProgramAction } from "@/server/actions/officer";
import { requirePortal } from "@/server/session";

export default async function Programs({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("officer");
  const [t, programs] = await Promise.all([getTranslations(), listPrograms()]);
  const canManage = can(actor.role, "program", "manage");
  const canBatch = can(actor.role, "batch", "create");

  return (
    <>
      <PageHeader eyebrow={t("portals.officer.title")} title={t("officer.programsTitle")} description={t("officer.programsDesc")} />
      <Stagger className="space-y-5">
        {programs.map(({ program, ministry }) => (
          <StaggerItem key={program.id}>
            <Card>
              <CardHeader
                title={<span className="flex items-center gap-2">{pickLocale(locale, program.nameBn, program.nameEn)}<Badge tone="dark">{program.code}</Badge></span>}
                description={`${pickLocale(locale, ministry.nameBn, ministry.nameEn)} · ${formatCrore(locale, program.annualBudget)}`}
                action={<Badge tone={program.active ? "green" : "neutral"}>{program.active ? t("status.active") : t("status.suspended")}</Badge>}
              />
              <CardBody className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
                <ActionForm action={updateProgramAction} className="space-y-4">
                  <input type="hidden" name="id" value={program.id} />
                  {program.povertyTargeted && (
                    <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
                      <ShieldCheck className="size-4 shrink-0" />{t("officer.affluenceGuard")}
                    </p>
                  )}
                  <Field label={t("officer.rules")} htmlFor={`rules-${program.id}`}>
                    <Textarea id={`rules-${program.id}`} name="rules" rows={7} readOnly={!canManage} spellCheck={false}
                      className="font-mono text-xs" defaultValue={JSON.stringify(program.rules, null, 2)} />
                  </Field>
                  <div className="flex flex-wrap items-end gap-4">
                    <Field label={t("officer.benefit")} htmlFor={`amount-${program.id}`} className="w-40">
                      <Input id={`amount-${program.id}`} name="amount" type="number" min={1} defaultValue={program.amount} readOnly={!canManage} />
                    </Field>
                    <label className="flex h-10 items-center gap-2 text-sm">
                      <input type="checkbox" name="active" value="true" defaultChecked={program.active} disabled={!canManage} className="size-4 accent-brand-600" />
                      {t("officer.active")}
                    </label>
                    {canManage && <SubmitButton variant="outline" className="ml-auto">{t("common.save")}</SubmitButton>}
                  </div>
                </ActionForm>
                {canBatch && (
                  <ActionForm action={generateBatchesAction} successKey="officer.generated" className="space-y-4 rounded-xl border border-dashed border-line bg-surface p-4">
                    <h3 className="font-semibold">{t("officer.generateTitle")}</h3>
                    <input type="hidden" name="programId" value={program.id} />
                    <Field label={t("officer.period")} htmlFor={`period-${program.id}`}>
                      <Input id={`period-${program.id}`} name="period" type="month" defaultValue={periodOf()} required />
                    </Field>
                    <p className="text-xs text-muted">{formatMoney(locale, program.amount)} × {t("status.active")}</p>
                    <SubmitButton className="w-full">{t("officer.generate")}</SubmitButton>
                  </ActionForm>
                )}
              </CardBody>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}
