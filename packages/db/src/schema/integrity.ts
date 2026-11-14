import { bigserial, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { user } from "./auth";
import { enrollments } from "./programs";

export const fraudFlags = pgTable(
  "fraud_flags",
  {
    id: id(),
    /** Deterministic key → scans are idempotent and can be re-run safely. */
    fingerprint: text().notNull().unique(),
    type: text().notNull(),
    severity: text({ enum: ["low", "medium", "high"] }).notNull(),
    nid: text().notNull(),
    enrollmentId: uuid().references(() => enrollments.id),
    detail: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    status: text({ enum: ["open", "confirmed", "dismissed"] }).notNull().default("open"),
    resolvedBy: text().references(() => user.id),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.status, t.severity), index().on(t.nid)],
);

export const grievances = pgTable(
  "grievances",
  {
    id: id(),
    nid: text().notNull(),
    userId: text().references(() => user.id),
    category: text({ enum: ["not_received", "wrong_amount", "exclusion", "corruption", "other"] }).notNull(),
    message: text().notNull(),
    status: text({ enum: ["open", "in_review", "resolved"] }).notNull().default("open"),
    response: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index().on(t.status), index().on(t.nid)],
);

/** Append-only, hash-chained. Production: REVOKE UPDATE, DELETE ON audit_log FROM app_role. */
export const auditLog = pgTable(
  "audit_log",
  {
    seq: bigserial({ mode: "number" }).primaryKey(),
    actorId: text(),
    actorRole: text(),
    action: text().notNull(),
    entity: text().notNull(),
    entityId: text(),
    data: jsonb().notNull().default({}),
    at: timestamp({ withTimezone: true, mode: "string" }).notNull(),
    prevHash: text().notNull(),
    hash: text().notNull().unique(),
  },
  (t) => [index().on(t.entity, t.entityId), index().on(t.actorId)],
);

/** Transactional outbox: integration events (SMS, payer dispatch) are written atomically, delivered by workers. */
export const outbox = pgTable(
  "outbox",
  {
    id: id(),
    topic: text().notNull(),
    payload: jsonb().notNull(),
    createdAt: createdAt(),
    deliveredAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.topic, t.deliveredAt)],
);
