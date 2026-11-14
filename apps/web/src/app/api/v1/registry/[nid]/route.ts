import { NextResponse } from "next/server";
import { AppError, benefitsOverview, lookupCitizen } from "@ep/core";
import { maskAccount } from "@ep/domain";
import type { LookupResponse } from "@/lib/api-types";
import { getActor } from "@/server/session";

const STATUS: Record<AppError["code"], number> = { FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, INVALID: 400 };

/** Officer NID lookup (jurisdiction-scoped). Consumed by TanStack Query; never cached by CDNs. */
export async function GET(_: Request, { params }: { params: Promise<{ nid: string }> }) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 401 });
  const { nid } = await params;
  try {
    const record = await lookupCitizen(actor, nid);
    const overview = await benefitsOverview(nid);
    const body: LookupResponse = {
      person: {
        nid: record.person.nid, nameBn: record.person.nameBn, nameEn: record.person.nameEn, dob: record.person.dob,
        gender: record.person.gender, divisionCode: record.person.divisionCode, occupation: record.person.occupation, isDeceased: record.person.isDeceased,
      },
      household: { upazila: record.household.upazila, union: record.household.union, members: record.members.length },
      score: overview.score,
      accounts: record.accounts.map((a) => ({ provider: a.provider, account: maskAccount(a.accountNumber), kycVerified: a.kycVerified })),
      programs: overview.programs.map(({ program, enrollment, evaluation }) => ({
        id: program.id, code: program.code, nameBn: program.nameBn, nameEn: program.nameEn, amount: program.amount,
        enrollmentStatus: enrollment?.status ?? null, eligible: evaluation.eligible, failed: [...new Set(evaluation.failed.map((f) => f.field))],
      })),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message || e.code }, { status: STATUS[e.code] });
    throw e;
  }
}
