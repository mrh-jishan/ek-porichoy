import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, type Actor } from "@ep/core";
import { can, type Action, type Resource } from "@ep/domain";
import { getActor } from "./session";

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

type Permission = { [R in Resource]: [R, Action<R>] }[Resource];

/**
 * The single server-action factory (DRY): authentication → permission → Zod validation →
 * domain call → error mapping → cache revalidation. Actions never repeat this plumbing.
 * Errors are returned as i18n keys (errors.*) so the UI renders them in the user's language.
 */
export function defineAction<S extends z.ZodType, R>(opts: {
  schema: S;
  permission?: Permission;
  revalidate?: string[];
  run: (input: z.infer<S>, actor: Actor) => Promise<R>;
}) {
  return async (_prev: ActionResult<R> | null, formData: FormData): Promise<ActionResult<R>> => {
    const actor = await getActor();
    if (!actor) return { ok: false, error: "FORBIDDEN" };
    if (opts.permission && !can(actor.role, ...(opts.permission as [Resource, never]))) return { ok: false, error: "FORBIDDEN" };

    const parsed = opts.schema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      const custom = parsed.error.issues.find((i) => i.code === "custom")?.message;
      return { ok: false, error: custom ?? "INVALID" };
    }
    try {
      const data = await opts.run(parsed.data, actor);
      for (const path of opts.revalidate ?? []) revalidatePath(`/[locale]${path}`, "page");
      return { ok: true, data };
    } catch (e) {
      if (e instanceof AppError) return { ok: false, error: /^[a-z_]+$/.test(e.message) ? e.message : e.code };
      if (e instanceof z.ZodError) return { ok: false, error: "INVALID" };
      console.error("[action]", e);
      return { ok: false, error: "generic" };
    }
  };
}
