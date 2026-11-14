import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import "../globals.css";

const bn = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-bn", display: "swap" });
const en = Inter({ subsets: ["latin"], variable: "--font-en", display: "swap" });

export const viewport: Viewport = { themeColor: "#006a4e" };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: locale as "bn", namespace: "common" });
  return {
    title: { default: `${t("appName")} — ${t("tagline")}`, template: `%s · ${t("appName")}` },
    description: t("tagline"),
    alternates: { languages: { bn: "/bn", en: "/en" } },
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${bn.variable} ${en.variable}`} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
