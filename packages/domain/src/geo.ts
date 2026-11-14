/** Administrative units used by seed data and jurisdiction scoping (subset; full BBS geocodes load from the registry). */
export const DIVISIONS = [
  { code: "30", bn: "ঢাকা", en: "Dhaka" },
  { code: "20", bn: "চট্টগ্রাম", en: "Chattogram" },
  { code: "40", bn: "খুলনা", en: "Khulna" },
  { code: "50", bn: "রাজশাহী", en: "Rajshahi" },
  { code: "55", bn: "রংপুর", en: "Rangpur" },
  { code: "60", bn: "সিলেট", en: "Sylhet" },
  { code: "10", bn: "বরিশাল", en: "Barishal" },
  { code: "45", bn: "ময়মনসিংহ", en: "Mymensingh" },
] as const;

export type DivisionCode = (typeof DIVISIONS)[number]["code"];

export const divisionName = (code: string, locale: "bn" | "en") =>
  DIVISIONS.find((d) => d.code === code)?.[locale] ?? code;
