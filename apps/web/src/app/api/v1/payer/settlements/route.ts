import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, settleBatch } from "@ep/core";
import { PROVIDERS } from "@ep/domain";

/**
 * Machine-to-machine settlement callback for banks / MFS core systems.
 *   X-EP-Timestamp: unix seconds (±300 s replay window)
 *   X-EP-Signature: hex(HMAC-SHA256(secret, `${timestamp}.${rawBody}`))
 * Production: per-payer secrets in a KMS/HSM and mutual TLS at the gateway.
 */
const body = z.object({
  batchId: z.uuid(),
  payerOrg: z.enum(PROVIDERS),
  results: z.array(z.object({
    id: z.uuid(), status: z.enum(["paid", "failed"]), txnRef: z.string().max(64).optional(), failureReason: z.string().max(200).optional(),
  })).max(50_000),
});

export async function POST(req: Request) {
  const secret = process.env.PAYER_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  const ts = Number(req.headers.get("x-ep-timestamp"));
  const sig = req.headers.get("x-ep-signature") ?? "";
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return NextResponse.json({ error: "stale" }, { status: 401 });
  const expected = createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
  const ok = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!ok) return NextResponse.json({ error: "bad_signature" }, { status: 401 });

  const parsed = body.safeParse(JSON.parse(raw));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  const { batchId, payerOrg, results } = parsed.data;
  try {
    const out = await settleBatch({ id: `api:${payerOrg}`, role: "payer", payerOrg }, batchId, results);
    return NextResponse.json({ status: "settled", ...out });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "NOT_FOUND" ? 404 : 409 });
    throw e;
  }
}
