import Script from "next/script";
import { umamiBeforeSend } from "@/lib/analytics-sanitize";

const WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const SRC = process.env.NEXT_PUBLIC_UMAMI_SRC ?? "https://analytics.online360.org/script.js";
/** Only these hostnames report, so localhost and preview deployments never pollute the stats. */
const DOMAINS = process.env.NEXT_PUBLIC_UMAMI_DOMAINS ?? "ekporichoy.online360.org";

/**
 * Self-hosted Umami (cookieless). Renders nothing unless a website ID is configured.
 * Personal data (NID, phone, OTP codes) is stripped in the browser before any event is sent.
 */
export function Analytics() {
  if (!WEBSITE_ID) return null;
  return (
    <>
      <Script id="umami-before-send" strategy="beforeInteractive">
        {`window.umamiBeforeSend = ${umamiBeforeSend.toString()};`}
      </Script>
      <Script
        src={SRC}
        strategy="afterInteractive"
        data-website-id={WEBSITE_ID}
        data-domains={DOMAINS}
        data-before-send="umamiBeforeSend"
        data-do-not-track="true"
      />
    </>
  );
}
