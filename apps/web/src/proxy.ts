import { getSessionCookie } from "better-auth/cookies";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);
const PROTECTED = /^\/(bn|en)\/(citizen|officer|payer|admin)(\/|$)/;

/**
 * Edge gate: locale negotiation + an optimistic session-cookie check.
 * Real authorisation (role, scope) happens server-side in every layout and service.
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const match = pathname.match(PROTECTED);
  if (match && !getSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${match[1]}/login`;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return intl(req);
}

export const config = { matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"] };
