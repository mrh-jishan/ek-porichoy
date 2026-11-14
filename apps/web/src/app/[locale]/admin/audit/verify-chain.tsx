"use client";
import { Link2, Link2Off, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useActionState } from "react";
import { formatNumber, type Locale } from "@ep/i18n";
import { SubmitButton } from "@/components/action-form";
import { verifyChainAction } from "@/server/actions/admin";

export function VerifyChain() {
  const t = useTranslations("admin");
  const locale = useLocale() as Locale;
  const [state, action] = useActionState(verifyChainAction, null);
  const result = state?.ok ? state.data : null;
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <AnimatePresence>
        {result && (
          <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${result.valid ? "bg-brand-50 text-brand-700" : "bg-accent-50 text-accent-700"}`}>
            {result.valid ? <Link2 className="size-4" /> : <Link2Off className="size-4" />}
            {result.valid ? t("chainValid", { total: formatNumber(locale, result.total) }) : t("chainBroken", { seq: String(result.brokenSeq) })}
          </motion.span>
        )}
      </AnimatePresence>
      <SubmitButton variant="outline"><ShieldCheck className="size-4" />{t("verifyChain")}</SubmitButton>
    </form>
  );
}
