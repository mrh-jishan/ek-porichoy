import type en from "./messages/en.json";

export const LOCALES = ["bn", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "bn";
export type Messages = typeof en;

const INTL: Record<Locale, string> = { bn: "bn-BD", en: "en-BD" };
export const intlLocale = (l: Locale) => INTL[l];

/** All number/money/date formatting goes through here so Bangla numerals are consistent everywhere. */
export const formatNumber = (l: Locale, n: number, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(INTL[l], opts).format(n);

export const formatMoney = (l: Locale, n: number) =>
  `৳${formatNumber(l, n, { maximumFractionDigits: 0 })}`;

/** Compact money in lakh/crore (South-Asian grouping), e.g. ৳১২.৫ কোটি / ৳12.5 crore. */
export function formatCrore(l: Locale, n: number) {
  const crore = 10_000_000, lakh = 100_000;
  const [value, unit] = n >= crore ? [n / crore, l === "bn" ? "কোটি" : "crore"] : n >= lakh ? [n / lakh, l === "bn" ? "লাখ" : "lakh"] : [n, ""];
  return `৳${formatNumber(l, value, { maximumFractionDigits: 1 })}${unit ? ` ${unit}` : ""}`;
}

export const formatDate = (l: Locale, d: Date | string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }) =>
  new Intl.DateTimeFormat(INTL[l], { timeZone: "Asia/Dhaka", ...opts }).format(typeof d === "string" ? new Date(d) : d);

export const formatPeriod = (l: Locale, period: string) => {
  const [y, m] = period.split("-").map(Number);
  return formatDate(l, new Date(Date.UTC(y!, m! - 1, 15)), { month: "long", year: "numeric" });
};

/** Pick the right column of a bilingual record (nameBn/nameEn, descriptionBn/…). */
export const pickLocale = <T,>(l: Locale, bn: T, en: T): T => (l === "bn" ? bn : en);
