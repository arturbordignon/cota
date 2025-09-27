import { permissionModules, type PermissionModuleKey } from '@/config/permission-modules';

export type DepartmentPermissionMap = Record<
  PermissionModuleKey,
  {
    view: boolean;
    edit: boolean;
  }
>;

export type DepartmentPreset = 'none' | 'view' | 'all' | 'custom';

export interface Department {
  id: string;
  name: string;
  description?: string;
  permissionPreset?: DepartmentPreset;
  permissions: DepartmentPermissionMap;
}

export function createPermissionMap(preset: Exclude<DepartmentPreset, 'custom'> = 'none'): DepartmentPermissionMap {
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
    Object.entries(map).map(([module, permissions]) => [module, { ...permissions }])
  ) as DepartmentPermissionMap;
}

export function cloneDepartment(department: Department): Department {
  return {
    ...department,
    permissions: clonePermissionMap(department.permissions),
  };
}

export const sampleDepartments: Department[] = [
  {
    id: 'dept-commercial',
    name: 'Comercial',
    description: 'Equipe responsável por prospecção e negociações.',
    permissionPreset: 'all',
    permissions: createPermissionMap('all'),
  },
  {
    id: 'dept-operations',
    name: 'Operações',
    description: 'Planejamento de execução e logística dos guindastes.',
    permissionPreset: 'view',
    permissions: {
      ...createPermissionMap('none'),
      proposals: { view: true, edit: true },
      templates: { view: true, edit: true },
      prospects: { view: true, edit: false },
      crm: { view: true, edit: true },
      reports: { view: true, edit: false },
    },
  },
  {
    id: 'dept-finance',
    name: 'Financeiro',
    description: 'Controle de faturamento e assinaturas.',
    permissionPreset: 'view',
    permissions: {
      ...createPermissionMap('none'),
      dashboard: { view: true, edit: false },
      proposals: { view: true, edit: false },
      reports: { view: true, edit: false },
      plan: { view: true, edit: true },
    },
  },
];
