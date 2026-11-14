"use client";
import { KeyRound, MessageSquareText, ShieldCheck, UserRound } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { DatePicker } from "@ep/ui/date-picker";
import { useActionState, useState } from "react";
import { Button, cn, Field, Input } from "@ep/ui";
import { SubmitButton } from "@/components/action-form";
import { requestCitizenOtp, staffSignIn, verifyCitizenOtp } from "@/server/actions/auth";

type Tab = "citizen" | "staff";

function ErrorText({ error }: { error?: string }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return <p role="alert" className="rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-700">{t.has(error as never) ? t(error as never) : t("generic")}</p>;
}

function CitizenFlow() {
  const t = useTranslations("auth");
  const tp = useTranslations("datePicker");
  const locale = useLocale() as "bn" | "en";
  const [otpState, requestOtp] = useActionState(requestCitizenOtp, null);
  const [verifyState, verify] = useActionState(verifyCitizenOtp, null);
  const [creds, setCreds] = useState({ nid: "", dob: "" });
  const [reset, setReset] = useState(0);
  const sent = otpState?.ok && reset === 0 ? otpState.data : null;

  return (
    <AnimatePresence mode="wait">
      {!sent ? (
        <motion.form key="nid" action={(fd) => { setReset(0); return requestOtp(fd); }} className="space-y-4"
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
          <p className="text-sm text-muted">{t("citizenNote")}</p>
          <Field label={t("nid")} htmlFor="nid">
            <Input id="nid" name="nid" inputMode="numeric" autoComplete="off" required pattern="\d{10}|\d{17}" value={creds.nid}
              onChange={(e) => setCreds((c) => ({ ...c, nid: e.target.value.replace(/\D/g, "") }))} placeholder="1990000001" />
          </Field>
          <Field label={t("dob")} htmlFor="dob">
            <DatePicker id="dob" name="dob" required value={creds.dob} onChange={(dob) => setCreds((c) => ({ ...c, dob }))}
              lang={locale} labels={{ open: tp("open"), clear: tp("clear"), placeholder: tp("placeholder") }}
              max={new Date().toISOString().slice(0, 10)} defaultMonth="1980-01-01" />
          </Field>
          <ErrorText error={otpState && !otpState.ok ? otpState.error : undefined} />
          <SubmitButton className="w-full" size="lg" data-umami-event="citizen-otp-request"><MessageSquareText className="size-4" />{t("sendOtp")}</SubmitButton>
        </motion.form>
      ) : (
        <motion.form key="otp" action={verify} className="space-y-4"
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>
          <input type="hidden" name="nid" value={creds.nid} />
          <input type="hidden" name="dob" value={creds.dob} />
          <p className="text-sm text-muted">{t("otpSentTo", { phone: sent.phone })}</p>
          {sent.demoCode && (
            <motion.p initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-lg border border-dashed border-gold-500 bg-gold-100 px-3 py-2 text-sm font-semibold text-amber-900">
              {t("demoOtp", { code: sent.demoCode })}
            </motion.p>
          )}
          <Field label={t("otp")} htmlFor="code">
            <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required pattern="\d{6}" autoFocus
              className="h-14 text-center font-mono text-2xl tracking-[0.6em]" />
          </Field>
          <ErrorText error={verifyState && !verifyState.ok ? verifyState.error : undefined} />
          <SubmitButton className="w-full" size="lg" data-umami-event="citizen-otp-verify"><ShieldCheck className="size-4" />{t("verify")}</SubmitButton>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setReset((r) => r + 1)}>{t("changeNid")}</Button>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

function StaffFlow({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(staffSignIn, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-muted">{t("staffNote")}</p>
      <Field label={t("email")} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="username" required /></Field>
      <Field label={t("password")} htmlFor="password"><Input id="password" name="password" type="password" autoComplete="current-password" required /></Field>
      <ErrorText error={state && !state.ok ? state.error : undefined} />
      <SubmitButton className="w-full" size="lg" data-umami-event="staff-sign-in"><KeyRound className="size-4" />{t("title")}</SubmitButton>
    </form>
  );
}

export function LoginTabs({ initial, next }: { initial: Tab; next: string }) {
  const t = useTranslations("auth");
  const [tab, setTab] = useState<Tab>(initial);
  const tabs: Array<{ id: Tab; label: string; icon: typeof UserRound }> = [
    { id: "citizen", label: t("citizenTab"), icon: UserRound },
    { id: "staff", label: t("staffTab"), icon: ShieldCheck },
  ];
  return (
    <div>
      <div role="tablist" className="mb-6 grid grid-cols-2 rounded-xl bg-surface p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={cn("relative flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors", tab === id ? "text-white" : "text-muted hover:text-ink")}>
            {tab === id && <motion.span layoutId="login-tab" className="absolute inset-0 rounded-lg bg-brand-600 shadow" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
            <Icon className="relative size-4" /><span className="relative">{label}</span>
          </button>
        ))}
      </div>
      {tab === "citizen" ? <CitizenFlow /> : <StaffFlow next={next} />}
    </div>
  );
}
