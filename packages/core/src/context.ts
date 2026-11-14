import { can, type Action, type Resource, type Role } from "@ep/domain";

/** The authenticated principal, resolved once per request by the web layer and passed to every service. */
export interface Actor {
  id: string;
  role: Role;
  nid?: string | null;
  payerOrg?: string | null;
  jurisdiction?: string | null;
}

export class AppError extends Error {
  constructor(
    public readonly code: "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INVALID",
    message: string,
  ) {
    super(message);
  }
}

/** Defense-in-depth: services re-check permissions even though routes are already guarded. */
export function authorize<R extends Resource>(actor: Actor, resource: R, action: Action<R>): void {
  if (!can(actor.role, resource, action)) throw new AppError("FORBIDDEN", `${actor.role} cannot ${action} ${resource}`);
}

export const SYSTEM_ACTOR: Actor = { id: "system", role: "super_admin" };
