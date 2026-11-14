"use client";
import { Contrast } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePreferences } from "@/stores/preferences";

export function A11yControls() {
  const t = useTranslations("common");
  const { cycleTextSize, toggleContrast, highContrast } = usePreferences();
  const btn = "grid h-6 min-w-6 place-items-center rounded px-1 font-semibold hover:bg-white/15";
  return (
    <span className="hidden items-center gap-0.5 sm:flex" role="group" aria-label={t("textSize")}>
      <button type="button" className={btn} onClick={() => cycleTextSize(-1)} aria-label={`${t("textSize")} −`}>A−</button>
      <button type="button" className={btn} onClick={() => cycleTextSize(1)} aria-label={`${t("textSize")} +`}>A+</button>
      <button type="button" className={btn} onClick={toggleContrast} aria-pressed={highContrast} aria-label={t("contrast")} title={t("contrast")}>
        <Contrast className="size-3.5" />
      </button>
    </span>
  );
}
