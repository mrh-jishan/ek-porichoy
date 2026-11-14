import { ArrowRight, Banknote, Building2, Fingerprint, Landmark, Network, Scale, ShieldCheck, Users, Wallet } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { publicStats } from "@ep/core";
import type { Locale } from "@ep/i18n";
import { buttonVariants, Card } from "@ep/ui";
import { AnimatedNumber, FadeIn, Stagger, StaggerItem } from "@ep/ui/motion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";
import { HeroVisual } from "./hero-visual";

export const revalidate = 300; // public transparency stats: ISR every 5 min - never hits the DB per visitor

const PROBLEMS = ["programmes", "fakeCards", "survey", "nid", "excluded", "elite"] as const;
const STEPS = [
  { key: "nid", icon: Fingerprint },
  { key: "link", icon: Network },
  { key: "rules", icon: Scale },
  { key: "pay", icon: Wallet },
] as const;
const PORTALS = [
  { key: "citizen", icon: Users },
  { key: "officer", icon: Landmark },
  { key: "payer", icon: Banknote },
  { key: "admin", icon: ShieldCheck },
] as const;

export default async function Landing({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const stats = await publicStats().catch(() => ({ citizens: 0, programs: 0, beneficiaries: 0, ghostCards: 0 }));

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* Hero */}
        <section className="bg-gov-pattern relative overflow-hidden text-white">
          <div className="bg-dots absolute inset-0 opacity-50" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
            <FadeIn>
              <p className="mb-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-brand-100 ring-1 ring-white/20">
                {t("landing.eyebrow")}
              </p>
              <h1 className="text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">{t("landing.heroTitle")}</h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-100 sm:text-lg">{t("landing.heroSubtitle")}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" data-umami-event="cta-citizen" className={buttonVariants({ variant: "accent", size: "lg" })}>
                  {t("landing.ctaCitizen")} <ArrowRight className="size-4" />
                </Link>
                <Link href="/login?as=staff" data-umami-event="cta-staff" className={buttonVariants({ variant: "light", size: "lg" })}>
                  {t("landing.ctaStaff")}
                </Link>
              </div>
            </FadeIn>
            <HeroVisual />
          </div>
        </section>

        {/* Problem */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <FadeIn className="mb-10 max-w-2xl">
            <p className="text-sm font-semibold text-accent-600">{t("landing.problemSubtitle")}</p>
            <h2 className="mt-1 text-3xl font-bold text-ink">{t("landing.problemTitle")}</h2>
          </FadeIn>
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PROBLEMS.map((k) => (
              <StaggerItem key={k}>
                <Card className="h-full border-l-4 border-l-accent-500 p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <p className="text-4xl font-bold text-accent-600">{t(`landing.problem.${k}.value`)}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`landing.problem.${k}.label`)}</p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        {/* Solution */}
        <section className="border-y border-line bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <FadeIn className="mb-10 text-center">
              <h2 className="text-3xl font-bold text-ink">{t("landing.solutionTitle")}</h2>
            </FadeIn>
            <Stagger className="relative grid gap-6 md:grid-cols-4">
              <div className="absolute top-8 right-[12%] left-[12%] hidden h-0.5 bg-gradient-to-r from-brand-200 via-brand-500 to-brand-200 md:block" />
              {STEPS.map(({ key, icon: Icon }, i) => (
                <StaggerItem key={key} className="relative text-center">
                  <div className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-brand-600 text-white shadow-lift ring-8 ring-white">
                    <Icon className="size-7" />
                    <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-accent-500 text-xs font-bold">{i + 1}</span>
                  </div>
                  <h3 className="mt-5 font-semibold text-ink">{t(`landing.steps.${key}.title`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`landing.steps.${key}.desc`)}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* Live stats + cost */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <FadeIn>
              <Card className="h-full p-6">
                <div className="mb-5 flex items-center gap-2">
                  <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-brand-500" /></span>
                  <h2 className="font-semibold text-ink">{t("landing.liveTitle")}</h2>
                </div>
                <dl className="grid grid-cols-2 gap-6">
                  {(["citizens", "programs", "beneficiaries", "ghostCards"] as const).map((k) => (
                    <div key={k}>
                      <dd className="text-3xl font-bold text-brand-700"><AnimatedNumber value={stats[k]} locale={locale} /></dd>
                      <dt className="mt-1 text-sm text-muted">{t(`landing.live.${k}`)}</dt>
                    </div>
                  ))}
                </dl>
              </Card>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="bg-gov-pattern relative h-full overflow-hidden rounded-card p-8 text-white">
                <Building2 className="absolute -right-6 -bottom-6 size-40 text-white/10" />
                <h2 className="text-2xl font-bold">{t("landing.costTitle")}</h2>
                <p className="mt-3 leading-relaxed text-brand-100">{t("landing.costDesc")}</p>
                <p className="mt-6 text-xs text-brand-200">{t("landing.source")}</p>
              </div>
            </FadeIn>
          </div>
        </section>

        {/* Portals */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <FadeIn className="mb-8"><h2 className="text-3xl font-bold text-ink">{t("landing.portalsTitle")}</h2></FadeIn>
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PORTALS.map(({ key, icon: Icon }) => (
                <StaggerItem key={key}>
                  <Link href={key === "citizen" ? "/login" : "/login?as=staff"} data-umami-event="portal-card" data-umami-event-portal={key} className="group block h-full rounded-card border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-brand-300 hover:bg-white hover:shadow-lift">
                    <span className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white transition group-hover:scale-110 group-hover:bg-accent-500"><Icon className="size-5" /></span>
                    <h3 className="mt-4 font-semibold text-ink">{t(`portals.${key}.title`)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`portals.${key}.desc`)}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">{t("common.openPortal")} <ArrowRight className="size-4 transition group-hover:translate-x-1" /></span>
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
