import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db, enrollments, fraudFlags, people } from "@ep/db";
import { detectFindings, FLAG_SEVERITY, type EnrollmentFact, type FlagType } from "@ep/domain";
import { AppError, authorize, type Actor } from "../context";
import { appendAudit } from "./audit";

const AFFLUENT_SQL = sql`(s.is_taxpayer or s.owns_vehicle or s.is_govt_employee or s.monthly_electricity_kwh > 250)`;

/**
 * Cross-registry integrity scan. Detectors are pure (packages/domain) — this module only
 * gathers facts and persists findings idempotently via a deterministic fingerprint.
 * Production: run per-partition by queue workers; group detectors (shared accounts) via SQL aggregates.
 */
export async function runIntegrityScan(actor: Actor) {
  authorize(actor, "flag", "scan");
  const facts = await db.execute<EnrollmentFact>(sql`
    select e.id "enrollmentId", e.nid, p.code "programCode", e.status,
           pe.is_deceased "isDeceased", ${AFFLUENT_SQL} "isAffluent", p.poverty_targeted "povertyTargeted",
           pa.account_number "accountNumber", pe.household_id::text "householdId"
    from enrollments e
    join programs p on p.id = e.program_id
    join people pe on pe.nid = e.nid
    join person_signals s on s.nid = e.nid
    left join payment_accounts pa on pa.nid = e.nid and pa.is_primary
    where e.status in ('verified','active')`);

  const findings = detectFindings([...facts]);
  let inserted = 0;
  await db.transaction(async (tx) => {
    for (let i = 0; i < findings.length; i += 500) {
      const chunk = findings.slice(i, i + 500).map((f) => ({
        fingerprint: `${f.type}:${f.nid}:${f.enrollmentId ?? JSON.stringify(f.detail)}`,
        type: f.type,
        severity: FLAG_SEVERITY[f.type],
        nid: f.nid,
        enrollmentId: f.enrollmentId ?? null,
        detail: f.detail,
      }));
      const rows = await tx.insert(fraudFlags).values(chunk).onConflictDoNothing().returning({ id: fraudFlags.id });
      inserted += rows.length;
    }
    const cards = await matchLegacyCards(tx);
    await appendAudit(tx, actor, "integrity.scan", "system", null, { scanned: facts.length, findings: findings.length, inserted, ...cards });
  });
  return { scanned: facts.length, findings: findings.length, newFlags: inserted };
}

/** Map legacy card numbers onto NIDs: unknown NID → ghost card; second card of same type → duplicate. */
async function matchLegacyCards(tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  const unmatched = await tx.execute(sql`
    update legacy_cards lc set status = 'unmatched'
    where status = 'pending' and (claimed_nid is null or not exists (select 1 from people p where p.nid = lc.claimed_nid))
    returning id`);
  const ranked = await tx.execute(sql`
    with r as (
      select id, row_number() over (partition by card_type, claimed_nid order by created_at, id) rn
      from legacy_cards where status = 'pending')
    update legacy_cards lc
      set status = case when r.rn = 1 then 'matched' else 'duplicate' end,
          matched_nid = case when r.rn = 1 then lc.claimed_nid end
    from r where r.id = lc.id
    returning lc.status`);
  return { cardsUnmatched: unmatched.length, cardsProcessed: ranked.length };
}

export async function listFlags(actor: Actor, opts: { status?: "open" | "confirmed" | "dismissed"; type?: FlagType; limit?: number } = {}) {
  authorize(actor, "flag", "read");
  return db
    .select({ flag: fraudFlags, nameBn: people.nameBn, nameEn: people.nameEn, divisionCode: people.divisionCode })
    .from(fraudFlags)
    .innerJoin(people, eq(people.nid, fraudFlags.nid))
    .where(and(
      opts.status ? eq(fraudFlags.status, opts.status) : undefined,
      opts.type ? eq(fraudFlags.type, opts.type) : undefined,
      actor.jurisdiction ? eq(people.divisionCode, actor.jurisdiction) : undefined,
    ))
    .orderBy(sql`case ${fraudFlags.severity} when 'high' then 0 when 'medium' then 1 else 2 end`, desc(fraudFlags.createdAt))
    .limit(opts.limit ?? 100);
}

/** Confirming a flag suspends the linked enrollment (or all of the NID's enrollments for person-level flags). */
export async function resolveFlag(actor: Actor, flagId: string, decision: "confirmed" | "dismissed") {
  authorize(actor, "flag", "resolve");
  return db.transaction(async (tx) => {
    const [flag] = await tx.select().from(fraudFlags).where(eq(fraudFlags.id, flagId)).for("update");
    if (!flag) throw new AppError("NOT_FOUND", "flag_not_found");
    if (flag.status !== "open") throw new AppError("CONFLICT", "already_resolved");
    await tx.update(fraudFlags).set({ status: decision, resolvedBy: actor.id, resolvedAt: new Date() }).where(eq(fraudFlags.id, flagId));
    if (decision === "confirmed")
      await tx.update(enrollments).set({ status: "suspended", note: `flag:${flag.type}` }).where(
        flag.enrollmentId
          ? eq(enrollments.id, flag.enrollmentId)
          : and(eq(enrollments.nid, flag.nid), inArray(enrollments.status, ["verified", "active"])),
      );
    await appendAudit(tx, actor, `flag.${decision}`, "flag", flagId, { type: flag.type, nid: flag.nid });
  });
}
