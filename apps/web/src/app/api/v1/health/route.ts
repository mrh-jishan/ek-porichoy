import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@ep/db";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for the load balancer / Kubernetes. */
export async function GET() {
  const started = performance.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok", db: "up", latencyMs: Math.round(performance.now() - started) });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
