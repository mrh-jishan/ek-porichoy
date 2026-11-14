"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Search, Skull } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { divisionName, isValidNid } from "@ep/domain";
import { formatMoney, formatNumber, pickLocale, type Locale } from "@ep/i18n";
import { Badge, Button, Card, CardBody, CardHeader, DefinitionList, Input, Skeleton } from "@ep/ui";
import { Meter } from "@ep/ui/motion";
import { ActionButton } from "@/components/action-form";
import type { ApiError, LookupResponse } from "@/lib/api-types";
import { usePathname, useRouter } from "@/i18n/navigation";
import { enrollAction } from "@/server/actions/officer";

const fetchRecord = async (nid: string): Promise<LookupResponse> => {
  const res = await fetch(`/api/v1/registry/${encodeURIComponent(nid)}`);
  const json = (await res.json()) as LookupResponse | ApiError;
  if (!res.ok) throw new Error("error" in json ? json.error : "generic");
  return json as LookupResponse;
};

/**
 * Server state via TanStack Query: lookups are cached per NID (back/forward is instant),
 * deduplicated, and invalidated after an enrolment mutation. The NID is mirrored in the URL.
 */
export function NidLookup({ initialNid }: { initialNid: string }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const qc = useQueryClient();
  const [input, setInput] = useState(initialNid);
  const [nid, setNid] = useState(isValidNid(initialNid) ? initialNid : "");

  const q = useQuery({ queryKey: ["registry", nid], queryFn: () => fetchRecord(nid), enabled: !!nid, retry: false });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.replace(/\D/g, "");
    setNid(clean);
    router.replace(`${pathname}?nid=${clean}` as never);
  };
  const errKey = q.error ? `errors.${q.error.message}` : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <form onSubmit={submit} className="flex gap-3">
            <Input value={input} onChange={(e) => setInput(e.target.value)} inputMode="numeric" placeholder={t("officer.lookupPlaceholder")} className="h-12 font-mono text-lg" aria-label={t("common.nid")} />
            <Button type="submit" size="lg" loading={q.isFetching}><Search className="size-4" />{t("common.search")}</Button>
          </form>
        </CardBody>
      </Card>

      <AnimatePresence mode="wait">
        {q.isLoading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" /><Skeleton className="h-64" />
          </motion.div>
        )}
        {errKey && (
          <motion.p key="err" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 rounded-lg bg-accent-50 px-4 py-3 text-sm font-medium text-accent-700">
            <AlertTriangle className="size-4" />{t.has(errKey as never) ? t(errKey as never) : t("errors.generic")}
          </motion.p>
        )}
        {q.data && (
          <motion.div key={q.data.person.nid} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <Card className="self-start">
              <CardHeader
                title={pickLocale(locale, q.data.person.nameBn, q.data.person.nameEn)}
                description={<span className="font-mono">{q.data.person.nid}</span>}
                action={q.data.person.isDeceased ? <Badge tone="red"><Skull className="size-3" />✝</Badge> : undefined}
              />
              <CardBody className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm"><span className="text-muted">{t("citizen.score")}</span><span className="font-bold text-brand-700">{formatNumber(locale, q.data.score)}</span></div>
                  <Meter value={q.data.score} />
                </div>
                <DefinitionList items={[
                  { term: t("auth.dob"), detail: q.data.person.dob },
                  { term: t("common.division"), detail: `${divisionName(q.data.person.divisionCode, locale)} · ${q.data.household.upazila}` },
                  { term: t("citizen.household"), detail: t("citizen.members", { count: q.data.household.members }) },
                  ...q.data.accounts.map((a) => ({
                    term: t(`providers.${a.provider as "bkash"}`), detail: <span className="font-mono">{a.account}</span>,
                    meta: a.kycVerified ? <CheckCircle2 className="size-4 text-brand-600" aria-label="KYC" /> : <AlertTriangle className="size-4 text-amber-600" aria-label="KYC pending" />,
                  })),
                ]} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t("citizen.benefitsTitle")} />
              <ul className="divide-y divide-line">
                {q.data.programs.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="font-medium">{pickLocale(locale, p.nameBn, p.nameEn)}</div>
                      <div className="text-xs text-muted">
                        {formatMoney(locale, p.amount)}
                        {!p.eligible && p.failed.length > 0 && <> · {p.failed.slice(0, 2).map((f) => t(`fields.${f as "age"}`)).join(", ")}</>}
                      </div>
                    </div>
                    {p.enrollmentStatus ? <Badge tone="green">{t(`status.${p.enrollmentStatus as "active"}`)}</Badge>
                      : p.eligible ? (
                        <ActionButton action={enrollAction} fields={{ nid: q.data!.person.nid, programId: p.id }} size="sm" successKey="officer.enrolled"
                          onSuccess={() => qc.invalidateQueries({ queryKey: ["registry", nid] })}>
                          {t("officer.enroll")}
                        </ActionButton>
                      ) : <Badge tone="neutral">{t("status.not_eligible")}</Badge>}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
