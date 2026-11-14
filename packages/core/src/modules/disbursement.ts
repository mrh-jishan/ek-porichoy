import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db, disbursementBatches, disbursements, outbox, people, programs } from "@ep/db";
import { assertTransition, PROVIDERS, TransitionError, type BatchStatus, type Provider } from "@ep/domain";
import { AppError, authorize, type Actor } from "../context";
import { appendAudit } from "./audit";

/**
 * Generate this period's payout batches for a programme — one per payer — with a single
 * set-based INSERT … SELECT (scales to millions of rows; no N+1, no app-side loops).
 * Integrity gates are enforced IN the query: deceased, unverified KYC and high-severity
 * fraud flags never reach a payer.
 */
export async function generateBatches(actor: Actor, programId: string, period: string) {
  authorize(actor, "batch", "create");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new AppError("INVALID", "invalid_period");

  return db.transaction(async (tx) => {
    const [program] = await tx.select().from(programs).where(eq(programs.id, programId));
    if (!program?.active) throw new AppError("NOT_FOUND", "program_not_found");

    const existing = await tx.select({ id: disbursementBatches.id, status: disbursementBatches.status })
      .from(disbursementBatches)
      .where(and(eq(disbursementBatches.programId, programId), eq(disbursementBatches.period, period)));
    if (existing.some((b) => b.status !== "cancelled")) throw new AppError("CONFLICT", "batch_exists");
    if (existing.length) await tx.delete(disbursementBatches).where(inArray(disbursementBatches.id, existing.map((b) => b.id)));

    const batches = await tx.insert(disbursementBatches)
      .values(PROVIDERS.map((provider) => ({ programId, period, provider, createdBy: actor.id })))
      .returning({ id: disbursementBatches.id });

    await tx.execute(sql`
      insert into disbursements (batch_id, enrollment_id, nid, period, amount, provider, account_number)
      select b.id, e.id, e.nid, ${period}, p.amount, pa.provider, pa.account_number
      from enrollments e
      join programs p on p.id = e.program_id
      join people pe on pe.nid = e.nid and not pe.is_deceased
      join payment_accounts pa on pa.nid = e.nid and pa.is_primary and pa.kyc_verified
      join disbursement_batches b on b.program_id = e.program_id and b.period = ${period} and b.provider = pa.provider
      where e.program_id = ${programId} and e.status = 'active'
        and not exists (
          select 1 from fraud_flags f
          where f.nid = e.nid and f.status in ('open','confirmed') and f.severity = 'high'
        )
      on conflict do nothing`);

    await tx.execute(sql`
      update disbursement_batches b set
        item_count = s.n, total_amount = s.total
      from (select batch_id, count(*)::int n, coalesce(sum(amount),0)::bigint total
            from disbursements where batch_id in ${batches.map((b) => b.id)} group by batch_id) s
      where b.id = s.batch_id`);
    await tx.delete(disbursementBatches).where(and(inArray(disbursementBatches.id, batches.map((b) => b.id)), eq(disbursementBatches.itemCount, 0)));

    const [{ active = 0 } = {}] = await tx.execute<{ active: number }>(
      sql`select count(*)::int active from enrollments where program_id = ${programId} and status = 'active'`,
    );
    const [{ included = 0, total = 0 } = {}] = await tx.execute<{ included: number; total: number }>(
      sql`select count(*)::int included, coalesce(sum(amount),0)::bigint total from disbursements d
          join disbursement_batches b on b.id = d.batch_id where b.program_id = ${programId} and b.period = ${period}`,
    );
    const summary = { included: Number(included), blocked: Number(active) - Number(included), total: Number(total) };
    await appendAudit(tx, actor, "batch.generate", "program", programId, { period, ...summary });
    return summary;
  });
}

async function lockBatch(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], batchId: string) {
  const [batch] = await tx.select().from(disbursementBatches).where(eq(disbursementBatches.id, batchId)).for("update");
  if (!batch) throw new AppError("NOT_FOUND", "batch_not_found");
  return batch;
}

const guardTransition = (actor: Actor, batch: typeof disbursementBatches.$inferSelect, to: BatchStatus) => {
  try {
    assertTransition(batch.status, to, { role: actor.role, actorId: actor.id, createdBy: batch.createdBy });
  } catch (e) {
    if (e instanceof TransitionError) throw new AppError("FORBIDDEN", e.message);
    throw e;
  }
  if (actor.role === "payer" && batch.provider !== actor.payerOrg) throw new AppError("FORBIDDEN", "wrong_payer");
};

/** approve / dispatch / cancel. Settlement has its own entry point because it carries payer results. */
export async function transitionBatch(actor: Actor, batchId: string, to: Exclude<BatchStatus, "settled" | "draft">) {
  authorize(actor, "batch", to === "approved" ? "approve" : to === "sent" ? "dispatch" : "create");
  return db.transaction(async (tx) => {
    const batch = await lockBatch(tx, batchId);
    guardTransition(actor, batch, to);
    await tx.update(disbursementBatches).set({
      status: to,
      ...(to === "approved" && { approvedBy: actor.id }),
      ...(to === "sent" && { sentAt: new Date() }),
    }).where(eq(disbursementBatches.id, batchId));
    if (to === "sent") {
      await tx.update(disbursements).set({ status: "sent" }).where(eq(disbursements.batchId, batchId));
      await tx.insert(outbox).values({ topic: `payer.${batch.provider}.dispatch`, payload: { batchId, items: batch.itemCount, amount: batch.totalAmount } });
    }
    await appendAudit(tx, actor, `batch.${to}`, "batch", batchId, { provider: batch.provider, amount: batch.totalAmount });
  });
}

export interface SettlementResult { id: string; status: "paid" | "failed"; txnRef?: string; failureReason?: string }

/** Payer reconciles a batch. Items not explicitly reported are marked paid with a generated reference. */
export async function settleBatch(actor: Actor, batchId: string, results: SettlementResult[] = []) {
  authorize(actor, "batch", "settle");
  return db.transaction(async (tx) => {
    const batch = await lockBatch(tx, batchId);
    guardTransition(actor, batch, "settled");
    const now = new Date();
    for (const r of results)
      await tx.update(disbursements)
        .set({ status: r.status, txnRef: r.txnRef ?? null, failureReason: r.failureReason ?? null, paidAt: r.status === "paid" ? now : null })
        .where(and(eq(disbursements.id, r.id), eq(disbursements.batchId, batchId), eq(disbursements.status, "sent")));
    await tx.execute(sql`
      update disbursements set status = 'paid', paid_at = ${now.toISOString()},
        txn_ref = ${batch.provider.toUpperCase().slice(0, 3)} || '-' || upper(substr(md5(id::text), 1, 10))
      where batch_id = ${batchId} and status = 'sent'`);
    await tx.update(disbursementBatches).set({ status: "settled", settledAt: now }).where(eq(disbursementBatches.id, batchId));
    const failed = results.filter((r) => r.status === "failed").length;
    await appendAudit(tx, actor, "batch.settled", "batch", batchId, { failed });
    return { failed };
  });
}

export async function failDisbursement(actor: Actor, disbursementId: string, reason: string) {
  authorize(actor, "batch", "settle");
  const [row] = await db.select({ batchId: disbursements.batchId }).from(disbursements).where(eq(disbursements.id, disbursementId));
  if (!row) throw new AppError("NOT_FOUND", "disbursement_not_found");
  return db.transaction(async (tx) => {
    const batch = await lockBatch(tx, row.batchId);
    if (actor.role === "payer" && batch.provider !== actor.payerOrg) throw new AppError("FORBIDDEN", "wrong_payer");
    if (batch.status !== "sent") throw new AppError("CONFLICT", "batch_not_open");
    await tx.update(disbursements).set({ status: "failed", failureReason: reason }).where(eq(disbursements.id, disbursementId));
    await appendAudit(tx, actor, "disbursement.failed", "disbursement", disbursementId, { reason });
  });
}

const batchColumns = {
  batch: disbursementBatches,
  programBn: programs.nameBn,
  programEn: programs.nameEn,
  programCode: programs.code,
};

export async function listBatches(actor: Actor, limit = 50) {
  authorize(actor, "batch", "read");
  const payerScope = actor.role === "payer"
    ? and(eq(disbursementBatches.provider, (actor.payerOrg ?? "none") as Provider), inArray(disbursementBatches.status, ["sent", "settled"]))
    : undefined;
  return db.select(batchColumns).from(disbursementBatches)
    .innerJoin(programs, eq(programs.id, disbursementBatches.programId))
    .where(payerScope)
    .orderBy(desc(disbursementBatches.createdAt))
    .limit(limit);
}

export async function getBatch(actor: Actor, batchId: string, limit = 200) {
  authorize(actor, "batch", "read");
  const [head] = await db.select(batchColumns).from(disbursementBatches)
    .innerJoin(programs, eq(programs.id, disbursementBatches.programId))
    .where(eq(disbursementBatches.id, batchId));
  if (!head) throw new AppError("NOT_FOUND", "batch_not_found");
  if (actor.role === "payer" && (head.batch.provider !== actor.payerOrg || head.batch.status === "draft" || head.batch.status === "approved"))
    throw new AppError("FORBIDDEN", "wrong_payer");
  const items = await db
    .select({ d: disbursements, nameBn: people.nameBn, nameEn: people.nameEn })
    .from(disbursements)
    .innerJoin(people, eq(people.nid, disbursements.nid))
    .where(eq(disbursements.batchId, batchId))
    .orderBy(disbursements.status, disbursements.nid)
    .limit(limit);
  return { ...head, items };
}

export async function paymentHistory(nid: string, limit = 24) {
  return db
    .select({ d: disbursements, programBn: programs.nameBn, programEn: programs.nameEn })
    .from(disbursements)
    .innerJoin(disbursementBatches, eq(disbursementBatches.id, disbursements.batchId))
    .innerJoin(programs, eq(programs.id, disbursementBatches.programId))
    .where(and(eq(disbursements.nid, nid), ne(disbursementBatches.status, "cancelled")))
    .orderBy(desc(disbursements.period))
    .limit(limit);
}
