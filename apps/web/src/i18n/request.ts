import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Static loaders (bundler-friendly, code-split per locale).
const MESSAGES = {
  bn: () => import("@ep/i18n/messages/bn.json"),
  en: () => import("@ep/i18n/messages/en.json"),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    timeZone: "Asia/Dhaka",
    messages: (await MESSAGES[locale]()).default,
  };
});
