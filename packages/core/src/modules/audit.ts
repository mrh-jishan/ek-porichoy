import { asc, desc, sql } from "drizzle-orm";
import { auditLog, db, type DbOrTx } from "@ep/db";
import { GENESIS_HASH, hashEntry, verifyChain, type AuditPayload } from "@ep/domain";
import { authorize, type Actor } from "../context";

const CHAIN_LOCK = 0x4550_4155; // "EPAU"

/**
 * Append to the hash chain inside the caller's transaction, so the audit entry
 * commits atomically with the change it describes.
 */
export async function appendAudit(
  tx: DbOrTx,
  actor: Actor | null,
  action: string,
  entity: string,
  entityId: string | null,
  data: Record<string, unknown> = {},
) {
  // Serialise writers so prev_hash is never forked. (Sharded chains per region at national scale.)
  await tx.execute(sql`select pg_advisory_xact_lock(${CHAIN_LOCK})`);
  const [last] = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.seq)).limit(1);
  const payload: AuditPayload = {
    actorId: actor?.id ?? null, action, entity, entityId, data, at: new Date().toISOString(),
  };
  const prevHash = last?.hash ?? GENESIS_HASH;
  await tx.insert(auditLog).values({
    ...payload, actorRole: actor?.role ?? null, data: payload.data as object, prevHash, hash: hashEntry(prevHash, payload),
  });
}

export async function listAudit(actor: Actor, limit = 100) {
  authorize(actor, "audit", "read");
  return db.select().from(auditLog).orderBy(desc(auditLog.seq)).limit(limit);
}

export async function verifyAuditChain(actor: Actor) {
  authorize(actor, "audit", "read");
  const rows = await db.select().from(auditLog).orderBy(asc(auditLog.seq));
  const result = verifyChain(
    rows.map((r) => ({
      prevHash: r.prevHash,
      hash: r.hash,
      // Postgres returns timestamptz in its own text format; normalise to the ISO string that was hashed.
      payload: { actorId: r.actorId, action: r.action, entity: r.entity, entityId: r.entityId, data: r.data, at: new Date(r.at).toISOString() },
    })),
  );
  return { ...result, total: rows.length, brokenSeq: result.brokenAt === null ? null : rows[result.brokenAt]?.seq ?? null };
}
