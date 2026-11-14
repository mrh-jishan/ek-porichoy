import { bigint, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { user } from "./auth";
import { enrollments, programs } from "./programs";

/**
 * One batch per (programme, period, payer). At national scale `disbursements` is
 * RANGE-partitioned by period and HASH sub-partitioned by nid (see docs/ARCHITECTURE.md).
 */
export const disbursementBatches = pgTable(
  "disbursement_batches",
  {
    id: id(),
    programId: uuid().notNull().references(() => programs.id),
    period: text().notNull(),
    provider: text({ enum: ["sonali_bank", "bkash", "nagad", "rocket"] }).notNull(),
    status: text({ enum: ["draft", "approved", "sent", "settled", "cancelled"] }).notNull().default("draft"),
    itemCount: integer().notNull().default(0),
    totalAmount: bigint({ mode: "number" }).notNull().default(0),
    createdBy: text().notNull().references(() => user.id),
    approvedBy: text().references(() => user.id),
    sentAt: timestamp({ withTimezone: true }),
    settledAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.programId, t.period, t.provider), index().on(t.provider, t.status)],
);

export const disbursements = pgTable(
  "disbursements",
  {
    id: id(),
    batchId: uuid().notNull().references(() => disbursementBatches.id, { onDelete: "cascade" }),
    enrollmentId: uuid().notNull().references(() => enrollments.id),
    nid: text().notNull(),
    period: text().notNull(),
    amount: integer().notNull(),
    provider: text().notNull(),
    accountNumber: text().notNull(),
    status: text({ enum: ["pending", "sent", "paid", "failed"] }).notNull().default("pending"),
    txnRef: text(),
    failureReason: text(),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    unique().on(t.batchId, t.enrollmentId), // idempotent generation
    index().on(t.nid, t.period),
    index().on(t.batchId, t.status),
  ],
);
