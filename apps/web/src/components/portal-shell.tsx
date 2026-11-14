import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { divisionName, type Portal, type Role } from "@ep/domain";
import type { Locale } from "@ep/i18n";
import { Badge } from "@ep/ui";
import { Link } from "@/i18n/navigation";
import { navFor } from "@/lib/nav";
import { signOutAction } from "@/server/actions/auth";
import { GovBand } from "./gov-band";
import { Logo } from "./logo";
import { MobileNavToggle, SidebarNav } from "./sidebar-nav";

interface ShellUser { name: string; role: Role; jurisdiction?: string | null; payerOrg?: string | null }

/** One shell for all four portals. Navigation is derived from the RBAC matrix for the signed-in role. */
export async function PortalShell({ portal, user, locale, children }: { portal: Portal; user: ShellUser; locale: Locale; children: ReactNode }) {
  const t = await getTranslations();
  const items = navFor(portal, user.role).map(({ href, label, icon: Icon }) => ({ href, label: t(`nav.${label}`), icon: <Icon className="size-4.5" aria-hidden /> }));
  const scope = user.payerOrg
    ? t(`providers.${user.payerOrg as "bkash"}`)
    : user.role !== "citizen"
      ? t("officer.jurisdiction", { name: user.jurisdiction ? divisionName(user.jurisdiction, locale) : t("officer.noJurisdiction") })
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <GovBand />
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <MobileNavToggle />
            <Link href="/" aria-label={t("common.appName")}><Logo title={t("common.appName")} subtitle={t(`portals.${portal}.title`)} /></Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-ink">{user.name}</div>
              <div className="flex items-center justify-end gap-1.5 text-xs text-muted">
                <Badge tone="green">{t(`roles.${user.role}`)}</Badge>
                {scope && <span>{scope}</span>}
              </div>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="grid size-9 place-items-center rounded-lg border border-line text-muted transition hover:border-accent-100 hover:bg-accent-50 hover:text-accent-600" aria-label={t("common.signOut")} title={t("common.signOut")}>
                <LogOut className="size-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex flex-1">
        <SidebarNav items={items} title={t(`portals.${portal}.title`)} />
        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
