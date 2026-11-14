import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, ministries, programs } from "@ep/db";
import type { RuleSet } from "@ep/domain";
import { AppError, authorize, type Actor } from "../context";
import { appendAudit } from "./audit";

export async function listPrograms() {
  return db
    .select({ program: programs, ministry: ministries })
    .from(programs)
    .innerJoin(ministries, eq(programs.ministryId, ministries.id))
    .orderBy(asc(programs.code));
}

export type ProgramWithMinistry = Awaited<ReturnType<typeof listPrograms>>[number];

const conditionSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
});
const ruleSetSchema: z.ZodType<RuleSet> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(z.union([conditionSchema, ruleSetSchema])) }),
    z.object({ any: z.array(z.union([conditionSchema, ruleSetSchema])) }),
  ]),
) as z.ZodType<RuleSet>;

export const programUpdateSchema = z.object({
  id: z.uuid(),
  amount: z.coerce.number().int().positive().max(100_000),
  active: z.literal("true").optional().transform(Boolean),
  rules: z.string().transform((s, ctx): RuleSet => {
    try {
      return ruleSetSchema.parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "invalid_rules" });
      return z.NEVER;
    }
  }),
});

export async function updateProgram(actor: Actor, input: unknown) {
  authorize(actor, "program", "manage");
  const data = programUpdateSchema.parse(input);
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(programs).where(eq(programs.id, data.id));
    if (!before) throw new AppError("NOT_FOUND", "program_not_found");
    await tx.update(programs).set({ amount: data.amount, active: data.active, rules: data.rules }).where(eq(programs.id, data.id));
    await appendAudit(tx, actor, "program.update", "program", data.id, {
      from: { amount: before.amount, active: before.active }, to: { amount: data.amount, active: data.active },
    });
  });
}
