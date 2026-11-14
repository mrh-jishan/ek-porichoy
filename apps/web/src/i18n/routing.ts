import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@ep/i18n";

export const routing = defineRouting({ locales: LOCALES, defaultLocale: DEFAULT_LOCALE, localePrefix: "always" });
