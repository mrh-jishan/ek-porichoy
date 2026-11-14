import type { Role } from "./roles.ts";

/**
 * RBAC matrix — the ONLY place permissions are defined.
 * Better-Auth's access-control plugin, server guards, core services and UI navigation all read from here.
 */
export const STATEMENTS = {
  profile: ["read_own", "apply"],
  registry: ["lookup"],
  enrollment: ["read", "create", "verify"],
  program: ["read", "manage"],
  batch: ["read", "create", "approve", "dispatch", "settle"],
  flag: ["read", "scan", "resolve"],
  grievance: ["create", "read", "respond"],
  audit: ["read"],
  analytics: ["read"],
  identity: ["manage"],
} as const;

export type Resource = keyof typeof STATEMENTS;
export type Action<R extends Resource> = (typeof STATEMENTS)[R][number];
export type Grants = { [R in Resource]?: ReadonlyArray<Action<R>> };

export const GRANTS: Record<Role, Grants> = {
  citizen: { profile: ["read_own", "apply"], grievance: ["create"] },
  field_officer: {
    registry: ["lookup"], enrollment: ["read", "create", "verify"], program: ["read"],
    grievance: ["read", "respond"], flag: ["read"],
  },
  program_manager: {
    registry: ["lookup"], enrollment: ["read", "create", "verify"], program: ["read", "manage"],
    batch: ["read", "create", "dispatch"], flag: ["read"], grievance: ["read", "respond"], analytics: ["read"],
  },
  payer: { batch: ["read", "settle"] },
  auditor: {
    enrollment: ["read"], program: ["read"], batch: ["read"], flag: ["read"],
    grievance: ["read"], audit: ["read"], analytics: ["read"],
  },
  super_admin: {
    registry: ["lookup"], enrollment: ["read", "create", "verify"], program: ["read", "manage"],
    batch: ["read", "create", "approve", "dispatch", "settle"], flag: ["read", "scan", "resolve"],
    grievance: ["read", "respond"], audit: ["read"], analytics: ["read"], identity: ["manage"],
  },
};

export function can<R extends Resource>(role: Role, resource: R, action: Action<R>): boolean {
  const granted = GRANTS[role][resource] as ReadonlyArray<string> | undefined;
  return granted?.includes(action) ?? false;
}
