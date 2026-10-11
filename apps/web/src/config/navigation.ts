import type { Route } from "next";

import type { PermissionModule } from "@/lib/auth-client";

export type NavKey =
  | "dashboard"
  | "templates"
  | "proposals"
  | "clients"
  | "services"
  | "team"
  | "activity"
  | "crm"
  | "reports"
  | "account";

export type NavItem = {
  key: NavKey;
  href: Route;
  icon: string;
  modulo?: PermissionModule;
  somenteDono?: boolean;
};

export const dashboardNav: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "house", modulo: "dashboard" },
  { key: "templates", href: "/templates", icon: "files", modulo: "templates" },
  { key: "proposals", href: "/proposals", icon: "envelope", modulo: "proposals" },
  { key: "clients", href: "/clients", icon: "users", modulo: "clients" },
  { key: "services", href: "/services", icon: "briefcase", modulo: "services" },
  { key: "team", href: "/team", icon: "userList", somenteDono: true },
  { key: "activity", href: "/activity", icon: "target", somenteDono: true },
  { key: "crm", href: "/crm", icon: "kanban", modulo: "crm" },
  { key: "reports", href: "/reports", icon: "chart", modulo: "reports" },
  { key: "account", href: "/account", icon: "userCircle" },
];

type AcessoUsuario = {
  isOwner: boolean;
  temPermissao: (modulo: PermissionModule, acao: "view" | "edit") => boolean;
};

export function itemVisivel(item: NavItem, acesso: AcessoUsuario) {
  if (item.somenteDono) {
    return acesso.isOwner;
  }
  if (!item.modulo) {
    return true;
  }
  return acesso.temPermissao(item.modulo, "view");
}
