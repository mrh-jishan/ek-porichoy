import { ShieldX } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@ep/i18n";
import { buttonVariants, Card } from "@ep/ui";
import { SiteHeader } from "@/components/site-header";
import { Link } from "@/i18n/navigation";
import { getActor, homeFor } from "@/server/session";

export default async function Forbidden({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, actor] = await Promise.all([getTranslations(), getActor()]);
  return (
    <>
      <SiteHeader />
      <main id="main" className="grid flex-1 place-items-center px-4 py-20">
        <Card className="max-w-md p-8 text-center">
          <ShieldX className="mx-auto size-12 text-accent-500" />
          <h1 className="mt-4 text-xl font-bold">{t("auth.forbiddenTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("auth.forbiddenDesc")}</p>
          <Link href={actor ? homeFor(actor) : "/login"} className={buttonVariants({ className: "mt-6" })}>{t("common.dashboard")}</Link>
        </Card>
      </main>
    </>
  );
}
