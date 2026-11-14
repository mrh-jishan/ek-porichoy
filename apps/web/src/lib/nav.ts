import type { LucideIcon } from "lucide-react";
import {
  Banknote, ClipboardCheck, FileClock, Fingerprint, Gauge, HandCoins, MessageSquareWarning, Scale, SearchCheck, ShieldAlert, UserCog, Users,
} from "lucide-react";
import { can, type Action, type Portal, type Resource, type Role } from "@ep/domain";
import type { Messages } from "@ep/i18n";

type Permission = { [R in Resource]: [R, Action<R>] }[Resource];

export interface NavItem {
  href: string;
  label: keyof Messages["nav"];
  icon: LucideIcon;
  /** Item is shown only if the role holds this permission - nav is derived from RBAC, never hand-maintained per role. */
  requires?: Permission;
}

export const PORTAL_NAV: Record<Portal, NavItem[]> = {
  citizen: [
    { href: "/citizen", label: "benefits", icon: Fingerprint },
    { href: "/citizen/payments", label: "payments", icon: HandCoins },
    { href: "/citizen/grievances", label: "grievances", icon: MessageSquareWarning },
  ],
  officer: [
    { href: "/officer", label: "queue", icon: ClipboardCheck, requires: ["enrollment", "verify"] },
    { href: "/officer/lookup", label: "lookup", icon: SearchCheck, requires: ["registry", "lookup"] },
    { href: "/officer/outreach", label: "outreach", icon: Users, requires: ["enrollment", "read"] },
    { href: "/officer/programs", label: "programs", icon: Scale, requires: ["program", "read"] },
    { href: "/officer/grievances", label: "grievances", icon: MessageSquareWarning, requires: ["grievance", "read"] },
  ],
  payer: [{ href: "/payer", label: "batches", icon: Banknote, requires: ["batch", "settle"] }],
  admin: [
    { href: "/admin", label: "overview", icon: Gauge, requires: ["analytics", "read"] },
    { href: "/admin/integrity", label: "integrity", icon: ShieldAlert, requires: ["flag", "read"] },
    { href: "/admin/batches", label: "batches", icon: Banknote, requires: ["batch", "read"] },
    { href: "/admin/audit", label: "audit", icon: FileClock, requires: ["audit", "read"] },
    { href: "/admin/users", label: "users", icon: UserCog, requires: ["identity", "manage"] },
  ],
};

export const navFor = (portal: Portal, role: Role) =>
  PORTAL_NAV[portal].filter((i) => !i.requires || can(role, ...(i.requires as [Resource, never])));
