import type { Tone } from "@ep/ui";

/** Every status string in the system maps to exactly one badge tone — used by <StatusBadge/>. */
export const STATUS_TONE: Record<string, Tone> = {
  active: "green", paid: "green", settled: "green", resolved: "green", matched: "green", eligible: "green", approved: "blue",
  pending: "amber", draft: "amber", open: "amber", in_review: "blue", sent: "blue", verified: "blue",
  suspended: "red", rejected: "red", failed: "red", confirmed: "red", unmatched: "red", duplicate: "red", not_eligible: "neutral",
  cancelled: "neutral", dismissed: "neutral",
  high: "red", medium: "amber", low: "neutral",
};
