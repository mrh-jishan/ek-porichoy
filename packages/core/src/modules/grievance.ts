import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, grievances, people } from "@ep/db";
import { AppError, authorize, type Actor } from "../context";
import { appendAudit } from "./audit";

export const grievanceSchema = z.object({
  category: z.enum(["not_received", "wrong_amount", "exclusion", "corruption", "other"]),
  message: z.string().trim().min(10).max(2000),
});

export async function fileGrievance(actor: Actor, input: z.input<typeof grievanceSchema>) {
  authorize(actor, "grievance", "create");
  if (!actor.nid) throw new AppError("FORBIDDEN", "nid_required");
  const data = grievanceSchema.parse(input);
  return db.transaction(async (tx) => {
    const [row] = await tx.insert(grievances).values({ ...data, nid: actor.nid!, userId: actor.id }).returning();
    // Corruption reports are visible to auditors but the reporter's NID is not exposed in the audit payload.
    await appendAudit(tx, actor, "grievance.create", "grievance", row!.id, { category: data.category });
    return row!;
  });
}

export const myGrievances = (nid: string) =>
  db.select().from(grievances).where(eq(grievances.nid, nid)).orderBy(desc(grievances.createdAt));

export async function listGrievances(actor: Actor, limit = 50) {
  authorize(actor, "grievance", "read");
  return db
    .select({ g: grievances, nameBn: people.nameBn, nameEn: people.nameEn, divisionCode: people.divisionCode })
    .from(grievances)
    .innerJoin(people, eq(people.nid, grievances.nid))
    .where(actor.jurisdiction ? eq(people.divisionCode, actor.jurisdiction) : undefined)
    .orderBy(desc(grievances.createdAt))
    .limit(limit);
}

export async function respondGrievance(actor: Actor, id: string, response: string, status: "in_review" | "resolved") {
  authorize(actor, "grievance", "respond");
  const text = z.string().trim().min(2).max(2000).parse(response);
  return db.transaction(async (tx) => {
    const [row] = await tx.update(grievances).set({ response: text, status }).where(eq(grievances.id, id)).returning();
    if (!row) throw new AppError("NOT_FOUND", "grievance_not_found");
    await appendAudit(tx, actor, `grievance.${status}`, "grievance", id, {});
  });
}
