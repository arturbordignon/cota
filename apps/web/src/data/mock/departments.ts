import { permissionModules, type PermissionModuleKey } from '@/config/permission-modules';

export type DepartmentPermission = {
  view: boolean;
  edit: boolean;
};

export type DepartmentPermissionMap = Record<PermissionModuleKey, DepartmentPermission>;

export type DepartmentPreset = 'none' | 'view' | 'all' | 'custom';

export function createPermissionMap(
  preset: Exclude<DepartmentPreset, 'custom'> = 'none',
): DepartmentPermissionMap {
  return permissionModules.reduce<DepartmentPermissionMap>((acc, module) => {
    if (preset === 'all') {
      acc[module] = { view: true, edit: true };
      return acc;
    }

    if (preset === 'view') {
      acc[module] = { view: true, edit: false };
      return acc;
    }

    acc[module] = { view: module === 'dashboard', edit: false };
    return acc;
  }, {} as DepartmentPermissionMap);
}

export function clonePermissionMap(map: DepartmentPermissionMap): DepartmentPermissionMap {
  return Object.fromEntries(
    Object.entries(map).map(([module, permissions]) => [module, { ...permissions }]),
  ) as DepartmentPermissionMap;
}

export function normalizePermissionMap(
  map: Partial<Record<PermissionModuleKey, Partial<DepartmentPermission>>> | null | undefined,
  fallbackPreset: Exclude<DepartmentPreset, 'custom'> = 'none',
): DepartmentPermissionMap {
  const base = createPermissionMap(fallbackPreset);

  if (!map) {
    return base;
  }

  for (const module of permissionModules) {
    const entry = map[module];
    if (!entry) continue;

    const view = Boolean(entry.view);
    const edit = view && Boolean(entry.edit);

    base[module] = { view, edit };
  }

  return base;
}
