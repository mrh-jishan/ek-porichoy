import { useTranslations } from "next-intl";
import { A11yControls } from "./a11y-controls";
import { LanguageSwitcher } from "./language-switcher";

/** Top band common to Bangladesh government portals: national affiliation, accessibility, language. */
export function GovBand() {
  const t = useTranslations("common");
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        {t("skipToContent")}
      </a>
      <div className="bg-brand-800 text-brand-50">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between gap-4 px-4 text-xs sm:px-6">
          <span className="flex items-center gap-2 truncate">
            <span className="inline-block h-3 w-5 shrink-0 rounded-[2px] bg-brand-600 ring-1 ring-white/30">
              <span className="mt-[2px] ml-[5px] block size-2 rounded-full bg-accent-500" />
            </span>
            <span className="truncate">{t("gov")}</span>
          </span>
          <span className="flex items-center gap-3">
            <A11yControls />
            <LanguageSwitcher />
          </span>
        </div>
      </div>
      <div className="bg-gold-100 px-4 py-1 text-center text-[11px] font-medium text-amber-900">{t("demoBanner")}</div>
    </>
  );
}
