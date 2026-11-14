import { useTranslations } from "next-intl";
import { Logo } from "./logo";

export function SiteFooter() {
  const t = useTranslations();
  return (
    <footer className="mt-auto bg-brand-950 text-brand-100">
      <div className="h-1 bg-gradient-to-r from-brand-600 via-accent-500 to-brand-600" />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <Logo title={t("common.appName")} subtitle={t("landing.eyebrow")} light />
          <p className="max-w-md text-sm text-brand-200">{t("common.tagline")}</p>
        </div>
        <div className="space-y-2 text-sm text-brand-200 md:text-right">
          <p>{t("common.gov")}</p>
          <p className="text-xs text-brand-300">{t("landing.source")}</p>
          <p className="text-xs text-brand-300">{t("common.demoBanner")}</p>
        </div>
      </div>
    </footer>
  );
}
