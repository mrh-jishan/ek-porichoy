import { setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import type { Portal, Role } from "@ep/domain";
import type { Locale } from "@ep/i18n";
import { requirePortal } from "@/server/session";
import { PortalShell } from "./portal-shell";

/**
 * Layout factory shared by all portals. NOTE: layouts and pages render in parallel in the App Router,
 * so every page ALSO calls requirePortal() (request-cached) — the layout gate is not relied on alone.
 */
export function portalLayout(portal: Portal) {
  return async function PortalLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    setRequestLocale(locale as Locale);
    const { user } = await requirePortal(portal);
    return (
      <PortalShell
        portal={portal}
        locale={locale as Locale}
        user={{ name: user.name, role: user.role as Role, jurisdiction: user.jurisdiction, payerOrg: user.payerOrg }}
      >
        {children}
      </PortalShell>
    );
  };
}

export type PageProps<P = object> = { params: Promise<{ locale: Locale } & P>; searchParams: Promise<Record<string, string | undefined>> };
