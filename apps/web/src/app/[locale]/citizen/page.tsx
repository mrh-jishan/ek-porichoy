import { CheckCircle2, CircleSlash, Clock, Database, Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { benefitsOverview } from "@ep/core";
import { divisionName, maskNid } from "@ep/domain";
import { formatMoney, formatNumber, pickLocale } from "@ep/i18n";
import { Badge, Card, CardBody, CardHeader, DefinitionList, PageHeader } from "@ep/ui";
import { FadeIn, Meter, Stagger, StaggerItem } from "@ep/ui/motion";
import { ActionButton } from "@/components/action-form";
import { DigitalIdCard } from "@/components/digital-id-card";
import type { PageProps } from "@/components/portal-layout";
import { StatusBadge } from "@/components/status-badge";
import { applyForProgram } from "@/server/actions/citizen";
import { requirePortal } from "@/server/session";

export default async function CitizenHome({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("citizen");
  const [t, data] = await Promise.all([getTranslations(), benefitsOverview(actor.nid!)]);
  const { record, score, programs } = data;
  const { person, signals } = record;
  const cards = programs.map((p) => pickLocale(locale, p.program.legacyCardBn, p.program.legacyCardEn)).filter(Boolean) as string[];

  const boolText = (v: boolean) => (v ? "✓" : "—");
  const linked: Array<{ field: Parameters<typeof t>[0]; value: string; source: string }> = [
    { field: "fields.monthlyIncome", value: formatMoney(locale, signals.monthlyIncome), source: "nbr_tax" },
    { field: "fields.landDecimals", value: formatNumber(locale, signals.landDecimals), source: "land_office" },
    { field: "fields.monthlyElectricityKwh", value: formatNumber(locale, signals.monthlyElectricityKwh), source: "utility" },
    { field: "fields.ownsVehicle", value: boolText(signals.ownsVehicle), source: "brta" },
    { field: "fields.isTaxpayer", value: boolText(signals.isTaxpayer), source: "nbr_tax" },
    { field: "fields.hasDisability", value: boolText(signals.hasDisability), source: "dghs" },
    { field: "fields.householdSize", value: formatNumber(locale, record.members.length), source: "ec_nid" },
  ];

  return (
    <>
      <PageHeader eyebrow={t("portals.citizen.title")} title={t("citizen.welcome", { name: pickLocale(locale, person.nameBn, person.nameEn) })} description={t("citizen.benefitsDesc")} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <FadeIn>
          <DigitalIdCard
            nameBn={person.nameBn}
            nameEn={person.nameEn}
            fatherNameBn={person.fatherNameBn}
            motherNameBn={person.motherNameBn}
            dob={person.dob}
            nid={person.nid}
            bloodGroup={person.bloodGroup}
            birthPlace={person.birthPlace}
            address={`${record.household.union}, ${record.household.upazila}, ${record.household.district}`}
            issuedAt={person.createdAt.toISOString()}
            programs={cards}
            labels={{
              flip: t("citizen.flipHint"),
              verify: t("citizen.verifyHint"),
              replaces: t("citizen.replaces", { count: formatNumber(locale, cards.length) }),
            }}
          />
        </FadeIn>
        <FadeIn delay={0.1}>
          <Card className="h-full">
            <CardHeader title={t("citizen.score")} description={t("citizen.scoreHint")} />
            <CardBody className="space-y-4">
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold text-brand-700">{formatNumber(locale, score)}</span>
                <span className="pb-1.5 text-muted">/ {formatNumber(locale, 100)}</span>
              </div>
              <Meter value={score} tone={score > 60 ? "brand" : "gold"} />
              <DefinitionList items={[
                { term: t("common.nid"), detail: <span className="font-mono">{maskNid(person.nid)}</span> },
                { term: t("citizen.household"), detail: t("citizen.members", { count: record.members.length }) },
                { term: t("common.division"), detail: `${divisionName(record.household.divisionCode, locale)} · ${record.household.upazila}` },
              ]} />
            </CardBody>
          </Card>
        </FadeIn>
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">{t("citizen.benefitsTitle")}</h2>
      <Stagger className="grid gap-4 md:grid-cols-2">
        {programs.map(({ program, ministry, enrollment, evaluation }) => {
          const state = enrollment?.status ?? (evaluation.eligible ? "eligible" : "not_eligible");
          const Icon = enrollment?.status === "active" ? CheckCircle2 : evaluation.eligible ? Clock : CircleSlash;
          return (
            <StaggerItem key={program.id}>
              <Card className="flex h-full flex-col p-5 transition hover:shadow-lift">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${enrollment?.status === "active" ? "bg-brand-600 text-white" : evaluation.eligible ? "bg-gold-100 text-amber-800" : "bg-surface text-muted"}`}>
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold text-ink">{pickLocale(locale, program.nameBn, program.nameEn)}</h3>
                      <p className="text-xs text-muted">{pickLocale(locale, ministry.nameBn, ministry.nameEn)}</p>
                    </div>
                  </div>
                  <StatusBadge status={state} />
                </div>
                <p className="mt-3 text-sm text-muted">{pickLocale(locale, program.descriptionBn, program.descriptionEn)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-brand-700">{formatMoney(locale, program.amount)}</span>
                  <span className="text-muted">{program.frequency === "monthly" ? t("common.perMonth") : t("common.perQuarter")}</span>
                  {program.legacyCardBn && <Badge tone="neutral" className="ml-auto">{t("citizen.replacesCard", { card: pickLocale(locale, program.legacyCardBn, program.legacyCardEn!) })}</Badge>}
                </div>
                {!evaluation.eligible && !enrollment && evaluation.failed.length > 0 && (
                  <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                    <span className="flex items-center gap-1 font-semibold"><Info className="size-3.5" />{t("citizen.whyNot")}</span>
                    <ul className="mt-1 list-inside list-disc">
                      {[...new Set(evaluation.failed.map((f) => f.field))].slice(0, 3).map((f) => <li key={f}>{t(`fields.${f}`)}</li>)}
                    </ul>
                  </div>
                )}
                {evaluation.eligible && !enrollment && (
                  <div className="mt-auto pt-4">
                    <ActionButton action={applyForProgram} fields={{ programId: program.id }} successKey="citizen.applied" size="sm">{t("citizen.apply")}</ActionButton>
                  </div>
                )}
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>

      <FadeIn className="mt-10">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Database className="size-4 text-brand-600" />{t("citizen.linkedTitle")}</span>} description={t("citizen.linkedDesc")} />
          <CardBody>
            <DefinitionList items={linked.map((l) => ({
              term: t(l.field), detail: l.value,
              meta: <Badge tone="blue">{t(`sources.${l.source as "ec_nid"}`)}</Badge>,
            }))} />
          </CardBody>
        </Card>
      </FadeIn>
    </>
  );
}
