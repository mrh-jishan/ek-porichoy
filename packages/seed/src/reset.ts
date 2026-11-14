import { sql } from "drizzle-orm";
import { db } from "@ep/db";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database");
await db.execute(sql`drop schema if exists public cascade; create schema public;`);
console.log("✓ schema dropped");
process.exit(0);
