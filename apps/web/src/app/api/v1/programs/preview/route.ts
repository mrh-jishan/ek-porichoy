import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError, previewRules, ruleSetSchema } from "@ep/core";
import { getActor } from "@/server/session";

const body = z.object({ rules: ruleSetSchema, povertyTargeted: z.boolean() });

/** Live impact of a draft rule set (rule builder). Read-only; never mutates. */
export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor) return NextResponse.json({ error: "FORBIDDEN" }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_rules" }, { status: 400 });
  try {
    const result = await previewRules(actor, parsed.data.rules, parsed.data.povertyTargeted);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.json({ error: e.message }, { status: e.code === "FORBIDDEN" ? 403 : 400 });
    throw e;
  }
}
