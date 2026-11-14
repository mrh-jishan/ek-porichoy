import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { auth } from "@ep/auth/server";
import type { Actor } from "@ep/core";
import { isRole, portalOf, type Portal } from "@ep/domain";
import { redirect } from "@/i18n/navigation";

/** Resolved once per request (React cache) and shared by layouts, pages and actions. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getActor = cache(async (): Promise<Actor | null> => {
  const session = await getSession();
  const u = session?.user;
  if (!u || u.banned || !isRole(u.role)) return null;
  return { id: u.id, role: u.role, nid: u.nid ?? null, payerOrg: u.payerOrg ?? null, jurisdiction: u.jurisdiction ?? null };
});

/** Gate a portal: unauthenticated → login, wrong role → forbidden. Returns the actor and display user. */
export async function requirePortal(portal: Portal) {
  const [actor, session, locale] = await Promise.all([getActor(), getSession(), getLocale()]);
  if (!actor || !session) return redirect({ href: "/login", locale });
  if (portalOf(actor.role) !== portal) return redirect({ href: "/forbidden", locale });
  return { actor, user: session.user };
}

export const homeFor = (actor: Actor) => `/${portalOf(actor.role)}` as const;
