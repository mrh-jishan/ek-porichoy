import { getTranslations } from "next-intl/server";
import { excludedEligible } from "@ep/core";
import { divisionName, maskNid } from "@ep/domain";
import { formatNumber, pickLocale } from "@ep/i18n";
import { Card, PageHeader } from "@ep/ui";
import { Meter, Stagger, StaggerItem } from "@ep/ui/motion";
import { ActionButton } from "@/components/action-form";
import type { PageProps } from "@/components/portal-layout";
import { enrollAction } from "@/server/actions/officer";
import { requirePortal } from "@/server/session";

export default async function Outreach({ params }: PageProps) {
  const { locale } = await params;
  const { actor } = await requirePortal("officer");
  const [t, rows] = await Promise.all([getTranslations(), excludedEligible(actor, 30)]);
  const canEnroll = actor.role === "field_officer" || actor.role === "program_manager";
  return (
    <>
      <PageHeader eyebrow={t("portals.officer.title")} title={t("officer.outreachTitle")} description={t("officer.outreachDesc")} />
      <Stagger className="grid gap-3">
        {rows.map(({ person, score, eligibleFor }) => (
          <StaggerItem key={person.nid}>
            <Card className="grid gap-4 p-4 sm:grid-cols-[1.2fr_160px_2fr] sm:items-center">
              <div>
                <div className="font-semibold">{pickLocale(locale, person.nameBn, person.nameEn)}</div>
                <div className="text-xs text-muted"><span className="font-mono">{maskNid(person.nid)}</span> · {divisionName(person.divisionCode, locale)}</div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs"><span className="text-muted">{t("citizen.score")}</span><b className="text-brand-700">{formatNumber(locale, score)}</b></div>
                <Meter value={score} />
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {eligibleFor.map((p) => canEnroll ? (
                  <ActionButton key={p.id} action={enrollAction} fields={{ nid: person.nid, programId: p.id }} size="sm" variant="secondary" successKey="officer.enrolled">
                    + {pickLocale(locale, p.nameBn, p.nameEn)}
                  </ActionButton>
                ) : <span key={p.id} className="text-xs">{pickLocale(locale, p.nameBn, p.nameEn)}</span>)}
              </div>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </>
  );
}
