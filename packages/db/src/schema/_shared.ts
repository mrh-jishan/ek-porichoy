import { timestamp, uuid } from "drizzle-orm/pg-core";

/** Reusable column helpers — keeps every table consistent (DRY). */
export const id = () => uuid().primaryKey().defaultRandom();
export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp({ withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());
