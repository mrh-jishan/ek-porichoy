"use server";
import { z } from "zod";
import { failDisbursement, settleBatch } from "@ep/core";
import { defineAction } from "../action";

export const settleBatchAction = defineAction({
  schema: z.object({ batchId: z.uuid() }),
  permission: ["batch", "settle"],
  revalidate: ["/payer", "/payer/[id]"],
  run: ({ batchId }, actor) => settleBatch(actor, batchId),
});

export const failDisbursementAction = defineAction({
  schema: z.object({ id: z.uuid(), reason: z.string().trim().min(3).max(200) }),
  permission: ["batch", "settle"],
  revalidate: ["/payer/[id]"],
  run: ({ id, reason }, actor) => failDisbursement(actor, id, reason),
});
