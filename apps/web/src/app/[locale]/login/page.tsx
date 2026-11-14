import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@ep/i18n";
import { Card } from "@ep/ui";
import { FadeIn } from "@ep/ui/motion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getActor, homeFor } from "@/server/session";
import { redirect } from "@/i18n/navigation";
import { LoginTabs } from "./login-tabs";

const DEMO = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true";

const DEMO_STAFF = [
  ["super_admin", "admin@ekporichoy.test"],
  ["auditor", "auditor@ekporichoy.test"],
  ["program_manager", "pm@ekporichoy.test"],
  ["field_officer", "officer@ekporichoy.test"],
  ["payer", "bkash@ekporichoy.test"],
] as const;
const DEMO_CITIZENS = [
  ["1990000001", "1956-03-14", "Rahima Begum"],
  ["1990000002", "1979-07-02", "Abdul Karim"],
  ["1990000003", "1975-11-20", "Tanvir Hossain"],
] as const;

export default async function LoginPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ as?: string; next?: string }> }) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const actor = await getActor();
  if (actor) redirect({ href: homeFor(actor), locale });
  const t = await getTranslations();

  return (
    <>
      <SiteHeader />
      <main id="main" className="bg-gov-pattern relative flex-1">
        <div className="bg-dots absolute inset-0 opacity-40" />
        <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_340px] lg:py-20">
          <FadeIn>
            <Card className="mx-auto w-full max-w-lg p-6 sm:p-8">
              <h1 className="mb-6 text-2xl font-bold text-ink">{t("auth.title")}</h1>
              <LoginTabs initial={sp.as === "staff" ? "staff" : "citizen"} next={sp.next ?? ""} />
            </Card>
          </FadeIn>
          {DEMO && (
            <FadeIn delay={0.15} className="text-sm text-white">
              <div className="rounded-card bg-white/10 p-5 ring-1 ring-white/20 backdrop-blur">
                <h2 className="font-semibold">{t("auth.demoAccounts")}</h2>
                <p className="mt-1 text-xs text-brand-100">{t("auth.demoPassword", { password: "Demo@2026!" })}</p>
                <ul className="mt-3 space-y-1.5 font-mono text-xs">
                  {DEMO_STAFF.map(([role, email]) => (
                    <li key={email} className="flex justify-between gap-2"><span className="text-brand-200">{t(`roles.${role}`)}</span><span>{email}</span></li>
                  ))}
                </ul>
                <hr className="my-4 border-white/20" />
                <h3 className="text-xs font-semibold text-brand-100">{t("auth.citizenTab")} — {t("auth.nid")} / {t("auth.dob")}</h3>
                <ul className="mt-2 space-y-1.5 font-mono text-xs">
                  {DEMO_CITIZENS.map(([nid, dob, name]) => (
                    <li key={nid} className="flex justify-between gap-2"><span>{nid} · {dob}</span><span className="text-brand-200">{name}</span></li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
