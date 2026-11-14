export const ENROLLMENT_STATUS = ["pending", "verified", "active", "suspended", "rejected"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[number];

export const BATCH_STATUS = ["draft", "approved", "sent", "settled", "cancelled"] as const;
export type BatchStatus = (typeof BATCH_STATUS)[number];

export const PAYMENT_STATUS = ["pending", "sent", "paid", "failed"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PROVIDERS = ["sonali_bank", "bkash", "nagad", "rocket"] as const;
export type Provider = (typeof PROVIDERS)[number];

export const PROVIDER_KIND: Record<Provider, "bank" | "mfs"> = {
  sonali_bank: "bank",
  bkash: "mfs",
  nagad: "mfs",
  rocket: "mfs",
};

export const FLAG_TYPES = [
  "deceased_recipient",
  "affluent_recipient",
  "shared_payment_account",
  "exclusive_program_conflict",
  "unmatched_legacy_card",
] as const;
export type FlagType = (typeof FLAG_TYPES)[number];

export const SEVERITY = ["low", "medium", "high"] as const;
export type Severity = (typeof SEVERITY)[number];

export const FLAG_SEVERITY: Record<FlagType, Severity> = {
  deceased_recipient: "high",
  affluent_recipient: "high",
  shared_payment_account: "medium",
  exclusive_program_conflict: "medium",
  unmatched_legacy_card: "low",
};

export const GRIEVANCE_STATUS = ["open", "in_review", "resolved"] as const;
export type GrievanceStatus = (typeof GRIEVANCE_STATUS)[number];

/** Linked government registries that feed the single-NID profile (the "no new cards" principle). */
export const DATA_SOURCES = ["ec_nid", "land_office", "nbr_tax", "utility", "brta", "dghs", "dae_farmer", "dof_fisher"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];
