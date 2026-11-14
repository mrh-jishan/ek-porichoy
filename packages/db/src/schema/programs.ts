import { bigint, boolean, index, integer, jsonb, pgTable, real, serial, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import type { RuleSet } from "@ep/domain";
import { createdAt, id, updatedAt } from "./_shared";
import { user } from "./auth";
import { people } from "./registry";

export const ministries = pgTable("ministries", {
  id: serial().primaryKey(),
  code: text().notNull().unique(),
  nameBn: text().notNull(),
  nameEn: text().notNull(),
});

export const programs = pgTable("programs", {
  id: id(),
  code: text().notNull().unique(),
  nameBn: text().notNull(),
  nameEn: text().notNull(),
  descriptionBn: text().notNull(),
  descriptionEn: text().notNull(),
  ministryId: integer().notNull().references(() => ministries.id),
  /** Benefit per cycle in BDT (integer taka - never floats for money). */
  amount: integer().notNull(),
  frequency: text({ enum: ["monthly", "quarterly"] }).notNull().default("monthly"),
  rules: jsonb().$type<RuleSet>().notNull(),
  povertyTargeted: boolean().notNull().default(true),
  annualBudget: bigint({ mode: "number" }).notNull(),
  /** The separate card this programme used to require - retired by Ek Porichoy. */
  legacyCardBn: text(),
  legacyCardEn: text(),
  active: boolean().notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    nid: text().notNull().references(() => people.nid),
    programId: uuid().notNull().references(() => programs.id),
    status: text({ enum: ["pending", "verified", "active", "suspended", "rejected"] }).notNull().default("pending"),
    povertyScore: real().notNull().default(0),
    source: text({ enum: ["legacy_import", "officer", "auto_match", "citizen_request"] }).notNull(),
    note: text(),
    enrolledBy: text().references(() => user.id),
    verifiedBy: text().references(() => user.id),
    verifiedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique().on(t.nid, t.programId), // one NID, one enrollment per programme - duplicates are structurally impossible
    index().on(t.programId, t.status),
    index().on(t.status),
  ],
);
