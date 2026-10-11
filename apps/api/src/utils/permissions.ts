import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DepartmentPreset, PermissionModule } from '@crane/db';

export const PERMISSION_KEYS = [
  'dashboard',
  'proposals',
  'templates',
  'crm',
  'reports',
  'plan',
  'clients',
  'services',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionMap = Record<PermissionKey, { view: boolean; edit: boolean }>;

type PresetBase = 'none' | 'view' | 'all';

type AcaoPermissao = 'view' | 'edit';

export const PERMISSION_KEY_TO_MODULE: Record<PermissionKey, PermissionModule> = {
  dashboard: 'DASHBOARD',
  proposals: 'PROPOSALS',
  templates: 'TEMPLATES',
  crm: 'CRM',
  reports: 'REPORTS',
  plan: 'PLAN',
  clients: 'CLIENTS',
  services: 'SERVICES',
};

export const MODULE_TO_KEY = Object.fromEntries(
  Object.entries(PERMISSION_KEY_TO_MODULE).map(([key, value]) => [value, key as PermissionKey]),
) as Partial<Record<PermissionModule, PermissionKey>>;

export function createPresetPermissionMap(preset: PresetBase): PermissionMap {
  return PERMISSION_KEYS.reduce<PermissionMap>((acc, key) => {
    if (preset === 'all') {
      acc[key] = { view: true, edit: true };
    } else if (preset === 'view') {
      acc[key] = { view: true, edit: false };
    } else {
      acc[key] = { view: key === 'dashboard', edit: false };
    }
    return acc;
  }, {} as PermissionMap);
}

export function mapFromDb(
  permissions: { module: PermissionModule; canView: boolean; canEdit: boolean }[],
  fallback: PresetBase,
): PermissionMap {
  const base = createPresetPermissionMap(fallback);
  for (const permission of permissions) {
    const key = MODULE_TO_KEY[permission.module];
    if (!key) continue;
    const view = Boolean(permission.canView);
    const edit = view && Boolean(permission.canEdit);
    base[key] = { view, edit };
  }
  return base;
}

function buscarPresetBase(preset: DepartmentPreset | null): PresetBase {
  switch (preset) {
    case 'ALL':
      return 'all';
    case 'VIEW':
      return 'view';
    default:
      return 'none';
  }
}

function buscarAcao(metodo: string): AcaoPermissao {
  if (metodo === 'GET' || metodo === 'HEAD') {
    return 'view';
  }
  return 'edit';
}

export async function carregarPermissoes(
  app: FastifyInstance,
  usuario: { sub: string; role: string },
): Promise<PermissionMap> {
  if (usuario.role === 'OWNER') {
    return createPresetPermissionMap('all');
  }

  const registro = await app.prisma.user.findUnique({
    where: { id: usuario.sub },
    select: {
      department: {
        select: {
          permissionPreset: true,
          permissions: { select: { module: true, canView: true, canEdit: true } },
        },
      },
    },
  });

  if (!registro?.department) {
    return createPresetPermissionMap('view');
  }

  return mapFromDb(
    registro.department.permissions,
    buscarPresetBase(registro.department.permissionPreset),
  );
}

export function exigirPermissao(modulo: PermissionKey, acaoFixa?: AcaoPermissao) {
  return async function verificarPermissao(request: FastifyRequest, reply: FastifyReply) {
    const permissoes = await carregarPermissoes(request.server, request.user);
    let acao = buscarAcao(request.method);
    if (acaoFixa) {
      acao = acaoFixa;
    }
    if (!permissoes[modulo][acao]) {
      return reply.status(403).send({ message: 'Forbidden' });
    }
  };
}
