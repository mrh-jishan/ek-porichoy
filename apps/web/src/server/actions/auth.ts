"use server";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { auth, devPeekOtp } from "@ep/auth/server";
import { matchNidDob } from "@ep/core";
import { isRole, isValidNid, portalOf } from "@ep/domain";
import { redirect } from "@/i18n/navigation";
import type { ActionResult } from "../action";

const nidDob = z.object({
  nid: z.string().trim().refine(isValidNid, { message: "invalid_nid" }),
  dob: z.iso.date(),
});

const maskPhone = (p: string) => `${p.slice(0, 7)}••••${p.slice(-2)}`;
const errorKey = (e: unknown, fallback: string) =>
  e && typeof e === "object" && "status" in e && (e as { status: unknown }).status === "TOO_MANY_REQUESTS" ? "rate_limited" : fallback;

/** Citizen step 1 - NID + DOB must match the EC record; the OTP goes only to the EC-registered phone. */
export async function requestCitizenOtp(_: unknown, form: FormData): Promise<ActionResult<{ phone: string; demoCode: string | null }>> {
  const parsed = nidDob.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message === "invalid_nid" ? "invalid_nid" : "INVALID" };
  const phone = await matchNidDob(parsed.data.nid, parsed.data.dob);
  if (!phone) return { ok: false, error: "nid_dob_mismatch" };
  try {
    await auth.api.sendPhoneNumberOTP({ body: { phoneNumber: phone }, headers: await headers() });
  } catch (e) {
    return { ok: false, error: errorKey(e, "generic") };
  }
  return { ok: true, data: { phone: maskPhone(phone), demoCode: await devPeekOtp(phone) } };
}

/** Citizen step 2 - verify OTP; first-time verification creates the identity bound to the NID. */
export async function verifyCitizenOtp(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = nidDob.extend({ code: z.string().regex(/^\d{6}$/) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "otp_invalid" };
  const phone = await matchNidDob(parsed.data.nid, parsed.data.dob);
  if (!phone) return { ok: false, error: "nid_dob_mismatch" };
  try {
    await auth.api.verifyPhoneNumber({ body: { phoneNumber: phone, code: parsed.data.code }, headers: await headers() });
  } catch (e) {
    return { ok: false, error: errorKey(e, "otp_invalid") };
  }
  return redirect({ href: "/citizen", locale: await getLocale() });
}

export async function staffSignIn(_: unknown, form: FormData): Promise<ActionResult> {
  const parsed = z.object({ email: z.email(), password: z.string().min(1) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "invalid_credentials" };
  let role: unknown;
  try {
    const res = await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
    role = (res.user as { role?: string }).role;
  } catch (e) {
    return { ok: false, error: errorKey(e, "invalid_credentials") };
  }
  const next = String(form.get("next") ?? "");
  const home = isRole(role) ? `/${portalOf(role)}` : "/";
  return redirect({ href: next.startsWith(home) ? next.replace(/^\/(bn|en)/, "") : home, locale: await getLocale() });
}

export async function signOutAction() {
  await auth.api.signOut({ headers: await headers() });
  return redirect({ href: "/", locale: await getLocale() });
}
