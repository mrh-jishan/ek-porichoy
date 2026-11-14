"use client";
import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [pending, start] = useTransition();
  const next = locale === "bn" ? "en" : "bn";
  return (
    <button
      type="button"
      lang={next}
      disabled={pending}
      onClick={() => start(() => router.replace({ pathname, params } as never, { locale: next }))}
      className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-semibold transition hover:bg-white/20 disabled:opacity-60"
    >
      <Languages className="size-3.5" aria-hidden />
      {t("language")}
    </button>
  );
}
