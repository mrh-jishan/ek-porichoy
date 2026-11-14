import { Ban, Banknote, Building, FileWarning, MessageSquareWarning, ShieldAlert, Users, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { nationalOverview } from "@ep/core";
import { divisionName } from "@ep/domain";
import { formatCrore, formatNumber } from "@ep/i18n";
import { Card, CardBody, CardHeader, PageHeader, StatCard } from "@ep/ui";
import { AnimatedNumber, FadeIn, Meter, Stagger, StaggerItem } from "@ep/ui/motion";
import { DonutChart, GroupedBarChart } from "@/components/charts";
import type { PageProps } from "@/components/portal-layout";
import { requirePortal } from "@/server/session";

export default async function AdminOverview({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("admin");
  const [t, o] = await Promise.all([getTranslations(), nationalOverview(actor)]);
  const cardsTotal = Object.values(o.cards).reduce((a, b) => a + b, 0) || 1;

  const kpis = [
    { label: t("admin.kpi.citizens"), value: o.citizens, icon: Users, style: "number" as const },
    { label: t("admin.kpi.enrollments"), value: o.activeEnrollments, icon: Building, style: "number" as const },
    { label: t("admin.kpi.outlay"), value: o.monthlyOutlay, icon: Wallet, style: "crore" as const },
    { label: t("admin.kpi.paid"), value: o.totalPaid, icon: Banknote, style: "crore" as const },
    { label: t("admin.kpi.leakage"), value: o.monthlyLeakageBlocked, icon: Ban, style: "crore" as const, tone: "accent" as const },
    { label: t("admin.kpi.flags"), value: o.openFlags, icon: ShieldAlert, style: "number" as const, tone: "accent" as const },
    { label: t("admin.kpi.grievances"), value: o.openGrievances, icon: MessageSquareWarning, style: "number" as const, tone: "gold" as const },
    { label: t("admin.kpi.programs"), value: o.programs, icon: FileWarning, style: "number" as const, tone: "ink" as const },
  ];

  return (
    <>
      <PageHeader eyebrow={actor.role === "auditor" ? t("admin.readOnly") : t("portals.admin.title")} title={t("admin.overviewTitle")} description={t("admin.overviewDesc")} />

      <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, style, tone }) => (
          <StaggerItem key={label}>
            <StatCard label={label} tone={tone} icon={<Icon className="size-5" />} value={<AnimatedNumber value={value} locale={locale} style={style} />} />
          </StaggerItem>
        ))}
      </Stagger>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeIn>
          <Card className="h-full">
            <CardHeader title={t("admin.targetingTitle")} />
            <CardBody className="space-y-6">
              {[
                { label: t("admin.poorExcluded"), value: o.poorExcludedPct, tone: "accent" as const },
                { label: t("admin.richIncluded"), value: o.richIncludedPct, tone: "gold" as const },
              ].map((m) => (
                <div key={m.label}>
                  <div className="mb-2 flex items-baseline justify-between gap-4">
                    <span className="text-sm text-muted">{m.label}</span>
                    <span className="text-2xl font-bold"><AnimatedNumber value={m.value} locale={locale} style="percent" /></span>
                  </div>
                  <Meter value={m.value} tone={m.tone} />
                </div>
              ))}
            </CardBody>
          </Card>
        </FadeIn>
        <FadeIn delay={0.08}>
          <Card className="h-full">
            <CardHeader title={t("admin.cardsTitle")} />
            <CardBody className="space-y-4">
              {(["matched", "duplicate", "unmatched"] as const).map((s) => {
                const n = o.cards[s] ?? 0;
                return (
                  <div key={s}>
                    <div className="mb-1.5 flex justify-between text-sm"><span className="text-muted">{t(`status.${s}`)}</span><b>{formatNumber(locale, n)}</b></div>
                    <Meter value={(n / cardsTotal) * 100} tone={s === "matched" ? "brand" : "accent"} />
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </FadeIn>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <FadeIn>
          <Card>
            <CardHeader title={t("admin.byDivision")} />
            <CardBody>
              <GroupedBarChart
                data={o.byDivision.map((d) => ({ label: divisionName(d.division, locale), enrolled: d.enrolled, flagged: d.flagged }))}
                series={[
                  { key: "enrolled", label: t("admin.kpi.enrollments"), color: "#006a4e" },
                  { key: "flagged", label: t("admin.kpi.flags"), color: "#f42a41" },
                ]}
              />
            </CardBody>
          </Card>
        </FadeIn>
        <FadeIn delay={0.08}>
          <Card className="h-full">
            <CardHeader title={t("admin.byProvider")} />
            <CardBody>
              <DonutChart
                center={formatCrore(locale, o.totalPaid)}
                data={o.byProvider.map((p) => ({ label: t(`providers.${p.provider as "bkash"}`), value: p.paid, display: formatCrore(locale, p.paid) }))}
              />
            </CardBody>
          </Card>
        </FadeIn>
      </div>

      <FadeIn className="mt-6">
        <Card>
          <CardHeader title={t("admin.flagsByType")} />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {o.flagsByType.map((f) => (
              <div key={f.type} className="rounded-xl border border-accent-100 bg-accent-50/50 p-4">
                <div className="text-2xl font-bold text-accent-600"><AnimatedNumber value={f.n} locale={locale} /></div>
                <div className="mt-1 text-sm text-muted">{t(`flags.${f.type as "deceased_recipient"}`)}</div>
              </div>
            ))}
          </CardBody>
        </Card>
      </FadeIn>
    </>
  );
}
