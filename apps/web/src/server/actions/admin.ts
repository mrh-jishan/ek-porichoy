"use server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@ep/auth/server";
import { appendAudit, resolveFlag, runIntegrityScan, transitionBatch, verifyAuditChain } from "@ep/core";
import { db } from "@ep/db";
import { defineAction } from "../action";

export const runScanAction = defineAction({
  schema: z.object({}),
  permission: ["flag", "scan"],
  revalidate: ["/admin", "/admin/integrity"],
  run: (_, actor) => runIntegrityScan(actor),
});

export const resolveFlagAction = defineAction({
  schema: z.object({ id: z.uuid(), decision: z.enum(["confirmed", "dismissed"]) }),
  permission: ["flag", "resolve"],
  revalidate: ["/admin/integrity", "/admin"],
  run: ({ id, decision }, actor) => resolveFlag(actor, id, decision),
});

export const transitionBatchAction = defineAction({
  schema: z.object({ id: z.uuid(), to: z.enum(["approved", "sent", "cancelled"]) }),
  permission: ["batch", "read"],
  revalidate: ["/admin/batches"],
  run: ({ id, to }, actor) => transitionBatch(actor, id, to),
});

export const verifyChainAction = defineAction({
  schema: z.object({}),
  permission: ["audit", "read"],
  run: (_, actor) => verifyAuditChain(actor),
});

/** Identity administration delegates to Better-Auth's admin plugin (which enforces its own RBAC) and is audited. */
export const setBanAction = defineAction({
  schema: z.object({ userId: z.string().min(1), banned: z.enum(["true", "false"]) }),
  permission: ["identity", "manage"],
  revalidate: ["/admin/users"],
  run: async ({ userId, banned }, actor) => {
    const h = await headers();
    if (banned === "true") await auth.api.banUser({ body: { userId, banReason: "Suspended by administrator" }, headers: h });
    else await auth.api.unbanUser({ body: { userId }, headers: h });
    await db.transaction((tx) => appendAudit(tx, actor, banned === "true" ? "identity.suspend" : "identity.restore", "user", userId));
  },
});
