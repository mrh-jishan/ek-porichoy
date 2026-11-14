import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import { GRANTS, ROLE_LIST, STATEMENTS, type Role } from "@ep/domain";

/**
 * Better-Auth access control generated from the domain RBAC matrix (single source of truth).
 * Only super_admin additionally receives Better-Auth's user/session administration rights.
 */
export const ac = createAccessControl({ ...defaultStatements, ...STATEMENTS });

type AnyStatements = Parameters<typeof ac.newRole>[0];

export const roles = Object.fromEntries(
  ROLE_LIST.map((role) => [
    role,
    ac.newRole({ ...(role === "super_admin" ? adminAc.statements : {}), ...GRANTS[role] } as AnyStatements),
  ]),
) as Record<Role, ReturnType<typeof ac.newRole>>;
