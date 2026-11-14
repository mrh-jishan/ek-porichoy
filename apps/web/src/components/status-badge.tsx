import { useTranslations } from "next-intl";
import { Badge } from "@ep/ui";
import type { Messages } from "@ep/i18n";
import { STATUS_TONE } from "@/lib/status";

/** One badge for every lifecycle status in the system (enrolment, batch, payment, flag, grievance, card). */
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("status");
  const label = t.has(status as keyof Messages["status"]) ? t(status as keyof Messages["status"]) : status;
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label}</Badge>;
}

export function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const t = useTranslations("severity");
  return <Badge tone={STATUS_TONE[severity] ?? "neutral"}>{t(severity)}</Badge>;
}
