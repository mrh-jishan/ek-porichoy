import { getTranslations } from "next-intl/server";
import { PageHeader } from "@ep/ui";
import type { PageProps } from "@/components/portal-layout";
import { requirePortal } from "@/server/session";
import { NidLookup } from "./nid-lookup";

export default async function Lookup({ searchParams }: PageProps) {
  await requirePortal("officer");
  const [t, sp] = await Promise.all([getTranslations(), searchParams]);
  return (
    <>
      <PageHeader eyebrow={t("portals.officer.title")} title={t("officer.lookupTitle")} description={t("officer.lookupDesc")} />
      <NidLookup initialNid={sp.nid ?? ""} />
    </>
  );
}
