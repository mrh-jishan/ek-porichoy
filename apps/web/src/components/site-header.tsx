import { useTranslations } from "next-intl";
import { buttonVariants } from "@ep/ui";
import { Link } from "@/i18n/navigation";
import { GovBand } from "./gov-band";
import { Logo } from "./logo";

export function SiteHeader() {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-40">
      <GovBand />
      <div className="border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={t("common.appName")}>
            <Logo title={t("common.appName")} subtitle={t("common.tagline")} />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className={buttonVariants({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}>{t("landing.ctaStaff")}</Link>
            <Link href="/login" className={buttonVariants({ size: "sm" })}>{t("landing.ctaCitizen")}</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
