"use server";
import { z } from "zod";
import { decideEnrollment, enroll, generateBatches, respondGrievance, updateProgram } from "@ep/core";
import { defineAction } from "../action";

export const decideEnrollmentAction = defineAction({
  schema: z.object({ id: z.uuid(), decision: z.enum(["active", "rejected"]) }),
  permission: ["enrollment", "verify"],
  revalidate: ["/officer"],
  run: ({ id, decision }, actor) => decideEnrollment(actor, id, decision),
});

export const enrollAction = defineAction({
  schema: z.object({ nid: z.string(), programId: z.uuid() }),
  permission: ["enrollment", "create"],
  revalidate: ["/officer/lookup", "/officer/outreach", "/officer"],
  run: ({ nid, programId }, actor) => enroll(actor, nid, programId).then(() => undefined),
});

export const updateProgramAction = defineAction({
  // Raw form fields pass through; the core service owns validation of rules JSON (defense in depth).
  schema: z.object({ id: z.string(), amount: z.string(), active: z.string().optional(), rules: z.string() }),
  permission: ["program", "manage"],
  revalidate: ["/officer/programs"],
  run: (input, actor) => updateProgram(actor, input),
});

export const generateBatchesAction = defineAction({
  schema: z.object({ programId: z.uuid(), period: z.string() }),
  permission: ["batch", "create"],
  revalidate: ["/officer/programs", "/admin/batches"],
  run: ({ programId, period }, actor) => generateBatches(actor, programId, period),
});

export const respondGrievanceAction = defineAction({
  schema: z.object({ id: z.uuid(), response: z.string(), status: z.enum(["in_review", "resolved"]) }),
  permission: ["grievance", "respond"],
  revalidate: ["/officer/grievances"],
  run: ({ id, response, status }, actor) => respondGrievance(actor, id, response, status),
});
