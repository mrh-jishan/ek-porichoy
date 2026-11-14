import { and, eq } from "drizzle-orm";
import { db, households, paymentAccounts, people, personSignals } from "@ep/db";
import { type CitizenProfile, isValidNid } from "@ep/domain";
import { AppError, authorize, type Actor } from "../context";

const ageFrom = (dob: string, now = new Date()) => {
  const d = new Date(dob);
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  if (now.getUTCMonth() < d.getUTCMonth() || (now.getUTCMonth() === d.getUTCMonth() && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
};

type PersonLike = Pick<typeof people.$inferInsert, "dob" | "gender" | "maritalStatus" | "occupation" | "isDeceased">;
type SignalLike = typeof personSignals.$inferInsert;

/** Map registry rows (DB rows or freshly built insert rows) to the rule-engine profile. */
export const toProfile = (p: PersonLike, s: SignalLike, householdSize: number): CitizenProfile => ({
  age: ageFrom(p.dob),
  gender: p.gender,
  maritalStatus: p.maritalStatus,
  monthlyIncome: s.monthlyIncome,
  householdSize,
  landDecimals: s.landDecimals ?? 0,
  isTaxpayer: s.isTaxpayer ?? false,
  ownsVehicle: s.ownsVehicle ?? false,
  monthlyElectricityKwh: s.monthlyElectricityKwh ?? 0,
  isGovtEmployee: s.isGovtEmployee ?? false,
  hasDisability: s.hasDisability ?? false,
  isPregnant: s.isPregnant ?? false,
  occupation: p.occupation as CitizenProfile["occupation"],
  isDeceased: p.isDeceased ?? false,
});

/** Full linked-registry view of one NID — the "one card replaces ninety" record. */
export async function getCitizenRecord(nid: string) {
  const row = await db.query.people.findFirst({ where: eq(people.nid, nid) });
  if (!row) return null;
  const [signals, accounts, members, household] = await Promise.all([
    db.query.personSignals.findFirst({ where: eq(personSignals.nid, nid) }),
    db.select().from(paymentAccounts).where(eq(paymentAccounts.nid, nid)),
    db.select({ nid: people.nid, nameBn: people.nameBn, nameEn: people.nameEn, dob: people.dob, gender: people.gender })
      .from(people).where(eq(people.householdId, row.householdId)),
    db.query.households.findFirst({ where: eq(households.id, row.householdId) }),
  ]);
  if (!signals) return null;
  return {
    person: row,
    signals,
    accounts,
    household: household!,
    members,
    profile: toProfile(row, signals, members.length),
  };
}

export type CitizenRecord = NonNullable<Awaited<ReturnType<typeof getCitizenRecord>>>;

/** Officer/manager lookup — scoped to the officer's jurisdiction when one is set. */
export async function lookupCitizen(actor: Actor, nid: string) {
  authorize(actor, "registry", "lookup");
  if (!isValidNid(nid)) throw new AppError("INVALID", "invalid_nid");
  const record = await getCitizenRecord(nid);
  if (!record) throw new AppError("NOT_FOUND", "nid_not_found");
  if (actor.jurisdiction && record.person.divisionCode !== actor.jurisdiction)
    throw new AppError("FORBIDDEN", "outside_jurisdiction");
  return record;
}

/** Step 1 of citizen sign-in: knowledge factor (NID + DOB) against the EC record. Returns the registered phone. */
export async function matchNidDob(nid: string, dob: string) {
  const [row] = await db
    .select({ phone: people.phone, isDeceased: people.isDeceased })
    .from(people)
    .where(and(eq(people.nid, nid), eq(people.dob, dob)))
    .limit(1);
  if (!row || row.isDeceased || !row.phone) return null;
  return row.phone;
}
