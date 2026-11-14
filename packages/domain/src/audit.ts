import { createHash } from "node:crypto";

/**
 * Tamper-evident audit chain: every entry commits to the previous entry's hash.
 * Any UPDATE/DELETE on historical rows breaks verification - auditors can prove integrity.
 */
export interface AuditPayload {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  data: unknown;
  at: string;
}

export const GENESIS_HASH = "0".repeat(64);

/**
 * Canonical JSON (recursively sorted keys). Required because Postgres jsonb does not preserve
 * key order, so a naive JSON.stringify of a re-read row would not re-hash identically.
 */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );

export const hashEntry = (prevHash: string, payload: AuditPayload): string =>
  createHash("sha256").update(prevHash).update(canonicalJson(payload)).digest("hex");

export function verifyChain(entries: Array<{ prevHash: string; hash: string; payload: AuditPayload }>) {
  let expectedPrev = GENESIS_HASH;
  for (const [i, e] of entries.entries()) {
    if (e.prevHash !== expectedPrev || hashEntry(e.prevHash, e.payload) !== e.hash) return { valid: false, brokenAt: i };
    expectedPrev = e.hash;
  }
  return { valid: true as const, brokenAt: null };
}
