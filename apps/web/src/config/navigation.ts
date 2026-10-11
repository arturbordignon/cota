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

export type NavGroup = "home" | "operations" | "sales" | "company";

export type NavItem = {
  key: NavKey;
  href: Route;
  icon: string;
  group: NavGroup;
  modulo?: PermissionModule;
  somenteDono?: boolean;
  /** Other routes that belong to this section, e.g. departments under team. */
  relacionados?: string[];
};

export const navGroups: NavGroup[] = ["home", "operations", "sales", "company"];

export const dashboardNav: NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: "house", group: "home", modulo: "dashboard" },
  { key: "proposals", href: "/proposals", icon: "envelope", group: "operations", modulo: "proposals" },
  { key: "clients", href: "/clients", icon: "users", group: "operations", modulo: "clients" },
  { key: "services", href: "/services", icon: "briefcase", group: "operations", modulo: "services" },
  { key: "templates", href: "/templates", icon: "files", group: "operations", modulo: "templates" },
  { key: "crm", href: "/crm", icon: "kanban", group: "sales", modulo: "crm" },
  { key: "reports", href: "/reports", icon: "chart", group: "sales", modulo: "reports" },
  { key: "team", href: "/team", icon: "userList", group: "company", somenteDono: true, relacionados: ["/departments"] },
  { key: "activity", href: "/activity", icon: "target", group: "company", somenteDono: true },
  { key: "account", href: "/account", icon: "userCircle", group: "company", relacionados: ["/plans"] },
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

export function itemAtivo(item: NavItem, pathname: string) {
  return [item.href, ...(item.relacionados ?? [])].some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`),
  );
}
