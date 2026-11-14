import type { FlagType } from "./enums.ts";

/**
 * Pure fraud/leakage detectors. They operate on plain records so they can run
 * in a request, a queue worker, or a nightly batch over partitioned data unchanged.
 */
export type EnrollmentFact = {
  enrollmentId: string;
  nid: string;
  programCode: string;
  status: string;
  isDeceased: boolean;
  isAffluent: boolean;
  povertyTargeted: boolean;
  accountNumber: string | null;
  householdId: string;
};

export interface Finding {
  type: FlagType;
  nid: string;
  enrollmentId?: string;
  detail: Record<string, unknown>;
}

/** Programmes a single person may not receive simultaneously (e.g. Old-Age and Widow allowance). */
export const EXCLUSIVE_GROUPS: string[][] = [["OAA", "WA"], ["OAA", "DA"]];

const ACTIVE = new Set(["verified", "active"]);

export function detectFindings(facts: EnrollmentFact[], sharedAccountThreshold = 3): Finding[] {
  const findings: Finding[] = [];
  const live = facts.filter((f) => ACTIVE.has(f.status));

  for (const f of live) {
    if (f.isDeceased)
      findings.push({ type: "deceased_recipient", nid: f.nid, enrollmentId: f.enrollmentId, detail: { program: f.programCode } });
    else if (f.isAffluent && f.povertyTargeted)
      findings.push({ type: "affluent_recipient", nid: f.nid, enrollmentId: f.enrollmentId, detail: { program: f.programCode } });
  }

  // One payment account receiving money on behalf of many unrelated households is the classic leakage pattern.
  const byAccount = new Map<string, EnrollmentFact[]>();
  for (const f of live) {
    if (!f.accountNumber) continue;
    byAccount.set(f.accountNumber, [...(byAccount.get(f.accountNumber) ?? []), f]);
  }
  for (const [account, group] of byAccount) {
    const households = new Set(group.map((g) => g.householdId));
    if (households.size >= sharedAccountThreshold)
      for (const nid of new Set(group.map((g) => g.nid)))
        findings.push({ type: "shared_payment_account", nid, detail: { account: account.slice(-4), households: households.size } });
  }

  const byNid = new Map<string, Set<string>>();
  for (const f of live) byNid.set(f.nid, (byNid.get(f.nid) ?? new Set()).add(f.programCode));
  for (const [nid, programs] of byNid)
    for (const group of EXCLUSIVE_GROUPS)
      if (group.every((code) => programs.has(code)))
        findings.push({ type: "exclusive_program_conflict", nid, detail: { programs: group } });

  return findings;
}
