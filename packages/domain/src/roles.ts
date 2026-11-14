/**
 * Single source of truth for every actor in the system.
 * Portals, navigation and permissions are all derived from this table — never hard-code role strings elsewhere.
 */
export const ROLES = {
  citizen: { portal: "citizen", staff: false },
  field_officer: { portal: "officer", staff: true },
  program_manager: { portal: "officer", staff: true },
  payer: { portal: "payer", staff: true },
  auditor: { portal: "admin", staff: true },
  super_admin: { portal: "admin", staff: true },
} as const;

export type Role = keyof typeof ROLES;
export type Portal = (typeof ROLES)[Role]["portal"];
export const ROLE_LIST = Object.keys(ROLES) as Role[];

export const isRole = (value: unknown): value is Role =>
  typeof value === "string" && value in ROLES;

export const portalOf = (role: Role): Portal => ROLES[role].portal;

/** Roles that may enter a given portal. */
export const rolesForPortal = (portal: Portal): Role[] =>
  ROLE_LIST.filter((r) => ROLES[r].portal === portal);
