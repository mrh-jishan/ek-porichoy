import { boolean, date, index, integer, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";

/**
 * Read-model of the Election Commission NID server + linked registries.
 * In production this is populated by CDC/API sync from EC, Land, NBR, utilities, BRTA, DGHS -
 * replacing door-to-door surveys and separate card databases.
 */
export const households = pgTable(
  "households",
  {
    id: id(),
    divisionCode: text().notNull(),
    district: text().notNull(),
    upazila: text().notNull(),
    union: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.divisionCode, t.upazila)],
);

export const people = pgTable(
  "people",
  {
    nid: text().primaryKey(),
    nameBn: text().notNull(),
    nameEn: text().notNull(),
    dob: date({ mode: "string" }).notNull(),
    gender: text({ enum: ["male", "female", "other"] }).notNull(),
    maritalStatus: text({ enum: ["single", "married", "widowed", "divorced"] }).notNull(),
    phone: text(),
    // Printed on the smart NID card (EC record)
    fatherNameBn: text(),
    motherNameBn: text(),
    bloodGroup: text(),
    birthPlace: text(),
    householdId: uuid().notNull().references(() => households.id),
    divisionCode: text().notNull(),
    occupation: text().notNull(),
    isDeceased: boolean().notNull().default(false),
    deceasedAt: date({ mode: "string" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.householdId), index().on(t.divisionCode), index().on(t.phone)],
);

/** Socio-economic signals harvested from interoperable registries, keyed by NID. */
export const personSignals = pgTable("person_signals", {
  nid: text().primaryKey().references(() => people.nid, { onDelete: "cascade" }),
  monthlyIncome: integer().notNull(),
  landDecimals: real().notNull().default(0),
  isTaxpayer: boolean().notNull().default(false),
  ownsVehicle: boolean().notNull().default(false),
  monthlyElectricityKwh: integer().notNull().default(0),
  isGovtEmployee: boolean().notNull().default(false),
  hasDisability: boolean().notNull().default(false),
  isPregnant: boolean().notNull().default(false),
  /** field -> registry that asserted it, e.g. { isTaxpayer: "nbr_tax" } */
  sources: jsonb().$type<Record<string, string>>().notNull().default({}),
  syncedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const paymentAccounts = pgTable(
  "payment_accounts",
  {
    id: id(),
    nid: text().notNull().references(() => people.nid, { onDelete: "cascade" }),
    provider: text({ enum: ["sonali_bank", "bkash", "nagad", "rocket"] }).notNull(),
    accountNumber: text().notNull(),
    /** KYC name/NID match confirmed by the provider. */
    kycVerified: boolean().notNull().default(false),
    isPrimary: boolean().notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.nid), index().on(t.accountNumber)],
);

/** Old paper/plastic cards being retired. Matching them to NIDs exposes ghosts (cf. 5.7M fake TCB cards). */
export const legacyCards = pgTable(
  "legacy_cards",
  {
    id: id(),
    cardType: text().notNull(),
    cardNumber: text().notNull().unique(),
    holderName: text().notNull(),
    claimedNid: text(),
    matchedNid: text().references(() => people.nid),
    status: text({ enum: ["pending", "matched", "duplicate", "unmatched"] }).notNull().default("pending"),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status), index().on(t.cardType)],
);
