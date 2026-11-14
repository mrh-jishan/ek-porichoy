"use server";
import { z } from "zod";
import { fileGrievance, grievanceSchema, requestEnrollment } from "@ep/core";
import { defineAction } from "../action";

export const applyForProgram = defineAction({
  schema: z.object({ programId: z.uuid() }),
  permission: ["profile", "apply"],
  revalidate: ["/citizen"],
  run: ({ programId }, actor) => requestEnrollment(actor, programId).then(() => undefined),
});

export const submitGrievance = defineAction({
  schema: grievanceSchema,
  permission: ["grievance", "create"],
  revalidate: ["/citizen/grievances"],
  run: (input, actor) => fileGrievance(actor, input).then(() => undefined),
});
