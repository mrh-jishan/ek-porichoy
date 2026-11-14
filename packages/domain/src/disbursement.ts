import type { BatchStatus, PaymentStatus } from "./enums.ts";
import type { Role } from "./roles.ts";

/**
 * Batch lifecycle with maker–checker control:
 *   draft --(approve: super_admin, ≠ creator)--> approved --(dispatch)--> sent --(payer settles)--> settled
 */
const TRANSITIONS: Record<BatchStatus, Partial<Record<BatchStatus, Role[]>>> = {
  draft: { approved: ["super_admin"], cancelled: ["program_manager", "super_admin"] },
  approved: { sent: ["program_manager", "super_admin"], cancelled: ["super_admin"] },
  sent: { settled: ["payer", "super_admin"] },
  settled: {},
  cancelled: {},
};

export class TransitionError extends Error {}

export function assertTransition(
  from: BatchStatus,
  to: BatchStatus,
  ctx: { role: Role; actorId: string; createdBy: string },
): void {
  const allowed = TRANSITIONS[from][to];
  if (!allowed) throw new TransitionError(`Illegal transition ${from} → ${to}`);
  if (!allowed.includes(ctx.role)) throw new TransitionError(`Role ${ctx.role} cannot move batch ${from} → ${to}`);
  if (to === "approved" && ctx.actorId === ctx.createdBy)
    throw new TransitionError("Maker–checker: the creator of a batch cannot approve it");
}

export const nextStatuses = (from: BatchStatus, role: Role): BatchStatus[] =>
  (Object.entries(TRANSITIONS[from]) as [BatchStatus, Role[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([to]) => to);

export const isTerminalPayment = (s: PaymentStatus) => s === "paid" || s === "failed";

/** Billing period key, e.g. "2026-11". Used as the partition key for disbursements. */
export const periodOf = (d: Date = new Date()) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
