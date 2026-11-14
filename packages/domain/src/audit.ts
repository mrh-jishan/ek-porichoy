import { createHash } from "node:crypto";
import { canonicalJson } from "./canonical.ts";

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
