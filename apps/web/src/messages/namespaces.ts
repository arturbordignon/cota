export const namespaces = [
  "common",
  "navigation",
  "actions",
  "dashboard",
  "clients",
  "reports",
  "team",
  "departments",
  "activity",
  "notifications"
] as const;

export type Namespace = (typeof namespaces)[number];
