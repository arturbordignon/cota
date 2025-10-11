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
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { key: "dashboard", href: "/", icon: "house" },
  { key: "templates", href: "/templates", icon: "files" },
  { key: "proposals", href: "/proposals", icon: "envelope" },
  { key: "clients", href: "/clients", icon: "users" },
  { key: "services", href: "/services", icon: "briefcase" },
  { key: "team", href: "/team", icon: "userList" },
  { key: "activity", href: "/activity", icon: "target" },
  { key: "crm", href: "/crm", icon: "kanban" },
  { key: "reports", href: "/reports", icon: "chart" },
  { key: "account", href: "/account", icon: "userCircle" },
];
