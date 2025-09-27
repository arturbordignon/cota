export const permissionModules = [
  "dashboard",
  "proposals",
  "templates",
  "prospects",
  "crm",
  "reports",
  "plan",
  "clients",
  "services"
] as const;

export type PermissionModuleKey = (typeof permissionModules)[number];
