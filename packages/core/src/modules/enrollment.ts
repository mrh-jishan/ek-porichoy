import { and, desc, eq, inArray, notExists, sql } from "drizzle-orm";
import { db, enrollments, households, people, personSignals, programs } from "@ep/db";
import { AFFLUENCE_GUARD, evaluate, povertyScore, type EnrollmentStatus, type RuleSet } from "@ep/domain";
import { AppError, authorize, type Actor } from "../context";
import { appendAudit } from "./audit";
import { getCitizenRecord, toProfile } from "./registry";
import { listPrograms } from "./programs";

/** Programme rules, plus the universal affluence guard for poverty-targeted schemes. */
export const effectiveRules = (p: { rules: RuleSet; povertyTargeted: boolean }): RuleSet =>
  p.povertyTargeted ? { all: [p.rules, AFFLUENCE_GUARD] } : p.rules;

/** Every programme evaluated against one citizen: enrolled / eligible / not eligible (+ reasons). */
export async function benefitsOverview(nid: string) {
  const [record, all, mine] = await Promise.all([
    getCitizenRecord(nid),
    listPrograms(),
    db.select().from(enrollments).where(eq(enrollments.nid, nid)),
  ]);
  if (!record) throw new AppError("NOT_FOUND", "nid_not_found");
  const byProgram = new Map(mine.map((e) => [e.programId, e]));
  return {
    record,
    score: povertyScore(record.profile),
    programs: all
      .filter(({ program }) => program.active)
      .map(({ program, ministry }) => ({
        program,
        ministry,
        enrollment: byProgram.get(program.id) ?? null,
        evaluation: evaluate(effectiveRules(program), record.profile),
      })),
  };
}

export async function enroll(actor: Actor, nid: string, programId: string, note?: string) {
  authorize(actor, "enrollment", "create");
  const overview = await benefitsOverview(nid);
  if (actor.jurisdiction && overview.record.person.divisionCode !== actor.jurisdiction)
    throw new AppError("FORBIDDEN", "outside_jurisdiction");
  const target = overview.programs.find((p) => p.program.id === programId);
  if (!target) throw new AppError("NOT_FOUND", "program_not_found");
  if (target.enrollment) throw new AppError("CONFLICT", "already_enrolled");
  if (!target.evaluation.eligible) throw new AppError("INVALID", "not_eligible");

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(enrollments)
      .values({ nid, programId, status: "pending", source: "officer", povertyScore: overview.score, enrolledBy: actor.id, note })
      .returning();
    await appendAudit(tx, actor, "enrollment.create", "enrollment", row!.id, { nid, programId });
    return row!;
  });
}

/** Maker–checker on enrollment: the officer who proposed it cannot also verify it. */
export async function decideEnrollment(actor: Actor, enrollmentId: string, decision: "active" | "rejected") {
  authorize(actor, "enrollment", "verify");
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ e: enrollments, division: people.divisionCode })
      .from(enrollments)
      .innerJoin(people, eq(people.nid, enrollments.nid))
      .where(eq(enrollments.id, enrollmentId))
      .for("update");
    if (!row) throw new AppError("NOT_FOUND", "enrollment_not_found");
    if (row.e.status !== "pending") throw new AppError("CONFLICT", "already_decided");
    if (row.e.enrolledBy === actor.id) throw new AppError("FORBIDDEN", "maker_checker");
    if (actor.jurisdiction && row.division !== actor.jurisdiction) throw new AppError("FORBIDDEN", "outside_jurisdiction");
    await tx.update(enrollments)
      .set({ status: decision, verifiedBy: actor.id, verifiedAt: new Date() })
      .where(eq(enrollments.id, enrollmentId));
    await appendAudit(tx, actor, `enrollment.${decision === "active" ? "approve" : "reject"}`, "enrollment", enrollmentId, {});
  });
}

export async function enrollmentQueue(actor: Actor, status: EnrollmentStatus = "pending", limit = 50) {
  authorize(actor, "enrollment", "read");
  return db
    .select({
      id: enrollments.id, nid: enrollments.nid, status: enrollments.status, score: enrollments.povertyScore,
      createdAt: enrollments.createdAt, enrolledBy: enrollments.enrolledBy, source: enrollments.source,
      nameBn: people.nameBn, nameEn: people.nameEn, divisionCode: people.divisionCode,
      programBn: programs.nameBn, programEn: programs.nameEn, programCode: programs.code,
    })
    .from(enrollments)
    .innerJoin(people, eq(people.nid, enrollments.nid))
    .innerJoin(programs, eq(programs.id, enrollments.programId))
    .where(and(eq(enrollments.status, status), actor.jurisdiction ? eq(people.divisionCode, actor.jurisdiction) : undefined))
    .orderBy(desc(enrollments.povertyScore))
    .limit(limit);
}

/**
 * Exclusion-error finder: poor citizens who qualify but receive nothing
 * (the World Bank's "62% of the poor get no benefit"). Ranked by poverty score so
 * officers reach the poorest first — no new survey required.
 * Production: precomputed nightly by a worker into a materialised table.
 */
export async function excludedEligible(actor: Actor, limit = 25, scan = 600) {
  authorize(actor, "enrollment", "read");
  const candidates = await db
    .select({ person: people, signals: personSignals, size: sql<number>`(select count(*)::int from ${people} p2 where p2.household_id = ${people.householdId})` })
    .from(people)
    .innerJoin(personSignals, eq(personSignals.nid, people.nid))
    .innerJoin(households, eq(households.id, people.householdId))
    .where(
      and(
        eq(people.isDeceased, false),
        actor.jurisdiction ? eq(people.divisionCode, actor.jurisdiction) : undefined,
        notExists(db.select({ one: sql`1` }).from(enrollments).where(and(eq(enrollments.nid, people.nid), inArray(enrollments.status, ["pending", "verified", "active"])))),
      ),
    )
    .orderBy(personSignals.monthlyIncome)
    .limit(scan);

  const progs = (await listPrograms()).filter((p) => p.program.active);
  return candidates
    .map(({ person, signals, size }) => {
      const profile = toProfile(person, signals, size);
      const eligibleFor = progs.filter(({ program }) => evaluate(effectiveRules(program), profile).eligible).map(({ program }) => program);
      return { person, score: povertyScore(profile), eligibleFor };
    })
    .filter((c) => c.eligibleFor.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Citizen self-service application — closes the exclusion gap without a field survey. */
export async function requestEnrollment(actor: Actor, programId: string) {
  authorize(actor, "profile", "apply");
  if (!actor.nid) throw new AppError("FORBIDDEN", "nid_required");
  const overview = await benefitsOverview(actor.nid);
  const target = overview.programs.find((p) => p.program.id === programId);
  if (!target) throw new AppError("NOT_FOUND", "program_not_found");
  if (target.enrollment) throw new AppError("CONFLICT", "already_enrolled");
  if (!target.evaluation.eligible) throw new AppError("INVALID", "not_eligible");
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(enrollments)
      .values({ nid: actor.nid!, programId, status: "pending", source: "citizen_request", povertyScore: overview.score, enrolledBy: actor.id })
      .returning();
    await appendAudit(tx, actor, "enrollment.request", "enrollment", row!.id, { programId });
    return row!;
  });
}
