import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

type Db = ReturnType<typeof create>;
const create = () =>
  drizzle(
    postgres(url, {
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idle_timeout: 20,
      // Behind PgBouncer (transaction mode) prepared statements must be off.
      prepare: process.env.DB_PGBOUNCER !== "true",
    }),
    { schema, casing: "snake_case" },
  );

// Reuse one pool across hot reloads in dev.
const g = globalThis as unknown as { __epDb?: Db };
export const db: Db = g.__epDb ?? create();
if (process.env.NODE_ENV !== "production") g.__epDb = db;

export type Database = Db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
