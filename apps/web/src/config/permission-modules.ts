export const permissionModules = [
  "dashboard",
  "proposals",
  "templates",
  "crm",
  "reports",
  "plan",
  "clients",
  "services"
] as const;

export type PermissionModuleKey = (typeof permissionModules)[number];
