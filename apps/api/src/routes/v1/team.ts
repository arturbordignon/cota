import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import { randomBytes, createHash } from 'crypto';
import dayjs from 'dayjs';
import type { DepartmentPreset as PrismaDepartmentPreset, PermissionModule } from '@crane/db';

import { CACHE_RESOURCES } from '../../constants/cache.js';
import { toDepartmentSlug } from '../../utils/slug.js';
import {
  PERMISSION_KEYS,
  PERMISSION_KEY_TO_MODULE,
  createPresetPermissionMap,
  mapFromDb,
} from '../../utils/permissions.js';
import type { PermissionKey, PermissionMap } from '../../utils/permissions.js';
import env from '@crane/config';

import { sendInviteEmail } from '../../lib/mailer.js';

const departmentPresetSchema = z.enum(['none', 'view', 'all', 'custom']);
type DepartmentPresetInput = z.infer<typeof departmentPresetSchema>;

const permissionAbilitySchema = z.object({
  view: z.boolean(),
  edit: z.boolean(),
});

const permissionMapSchema = z.object(
  Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, permissionAbilitySchema]),
  ) as Record<PermissionKey, typeof permissionAbilitySchema>,
);

const createDepartmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  permissionPreset: departmentPresetSchema.default('view'),
  permissions: permissionMapSchema.optional(),
});

const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  permissionPreset: departmentPresetSchema.optional(),
  permissions: permissionMapSchema.optional(),
});

const createMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email(),
  jobTitle: z.string().optional(),
  departmentId: z.string().uuid().optional(),
});

const updateMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  role: z.enum(['OWNER', 'MEMBER']).optional(),
  isActive: z.boolean().optional(),
});

const rankingQuerySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).default('month'),
});

const invitePreviewSchema = z.object({
  token: z.string().min(16),
});

const acceptInviteSchema = z.object({
  token: z.string().min(16),
  fullName: z.string().min(2).optional(),
  password: z.string().min(8),
});

const inviteLinkBodySchema = z.object({
  sendEmail: z.boolean().optional(),
});

const INVITE_TOKEN_BYTES = 32;
const INVITE_EXPIRATION_DAYS = 7;

function hashInviteToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toDbPreset(preset: DepartmentPresetInput): PrismaDepartmentPreset {
  switch (preset) {
    case 'none':
      return 'NONE';
    case 'view':
      return 'VIEW';
    case 'all':
      return 'ALL';
    case 'custom':
    default:
      return 'CUSTOM';
  }
}

function fromDbPreset(preset?: PrismaDepartmentPreset | null): DepartmentPresetInput {
  switch (preset) {
    case 'NONE':
      return 'none';
    case 'VIEW':
      return 'view';
    case 'ALL':
      return 'all';
    case 'CUSTOM':
    default:
      return 'custom';
  }
}

function clonePermissionMap(map: PermissionMap): PermissionMap {
  return PERMISSION_KEYS.reduce<PermissionMap>((acc, key) => {
    acc[key] = { ...map[key] };
    return acc;
  }, {} as PermissionMap);
}

function applyPermissionOverrides(
  base: PermissionMap,
  overrides?: Record<PermissionKey, { view: boolean; edit: boolean }>,
): PermissionMap {
  if (!overrides) {
    return base;
  }

  for (const key of PERMISSION_KEYS) {
    const entry = overrides[key];
    if (!entry) continue;
    const view = Boolean(entry.view);
    const edit = view && Boolean(entry.edit);
    base[key] = { view, edit };
  }

  return base;
}

function serializeDepartment(department: {
  id: string;
  name: string;
  description: string | null;
  permissionPreset: PrismaDepartmentPreset | null;
  permissions: { module: PermissionModule; canView: boolean; canEdit: boolean }[];
}) {
  const preset = fromDbPreset(department.permissionPreset);
  const fallback = preset === 'custom' ? 'none' : (preset as Exclude<DepartmentPresetInput, 'custom'>);
  const permissionMap = mapFromDb(department.permissions, fallback);

  return {
    id: department.id,
    name: department.name,
    description: department.description,
    permissionPreset: preset,
    permissions: Object.fromEntries(
      PERMISSION_KEYS.map((key) => [key, { ...permissionMap[key] }]),
    ),
  };
}

async function generateDepartmentSlug(
  accountId: string,
  name: string,
  prisma: typeof import('@crane/db').prisma,
) {
  const base = toDepartmentSlug(name) || 'department';
  let slug = base;
  let attempt = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.department.findFirst({
      where: { accountId, slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    slug = `${base}-${attempt}`;
    attempt += 1;
  }
}

const teamRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request, reply) => {
    const rotaAtual = request.routeOptions.url ?? '';
    if (rotaAtual.endsWith('/invite/preview') || rotaAtual.endsWith('/invite/accept')) {
      return;
    }
    return app.authenticate(request, reply);
  });

  app.get('/', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const [departments, members] = await Promise.all([
      app.prisma.department.findMany({
        where: { accountId: request.user.accountId },
        include: { permissions: true },
        orderBy: { name: 'asc' },
      }),
      app.prisma.user.findMany({
        where: { accountId: request.user.accountId },
        select: {
          id: true,
          email: true,
          role: true,
          fullName: true,
          jobTitle: true,
          departmentId: true,
          isActive: true,
          createdAt: true,
          inviteTokenExpiresAt: true,
          invitedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const departmentPayload = departments.map((department) => serializeDepartment(department));

    const memberPayload = members.map((member) => ({
      id: member.id,
      email: member.email,
      role: member.role,
      fullName: member.fullName,
      jobTitle: member.jobTitle,
      departmentId: member.departmentId,
      department: member.department,
      isActive: member.isActive,
      createdAt: member.createdAt,
      inviteTokenExpiresAt: member.inviteTokenExpiresAt,
      invitedAt: member.invitedAt,
    }));

    return reply.send({
      data: {
        departments: departmentPayload,
        members: memberPayload,
      },
    });
  });

  app.get('/ranking', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const query = rankingQuerySchema.parse(request.query);

    const cacheKey = app.cache.buildKey({
      resource: CACHE_RESOURCES.TEAM_RANKING,
      accountId: request.user.accountId,
      params: query,
    });

    function resolveRange(period: 'month' | 'quarter' | 'year') {
      const end = dayjs();
      let start: dayjs.Dayjs;

      if (period === 'month') {
        start = end.subtract(30, 'day');
      } else if (period === 'quarter') {
        start = end.subtract(90, 'day');
      } else {
        start = end.subtract(365, 'day');
      }

      return { start: start.startOf('day'), end: end.endOf('day') };
    }

    function getNumericTotal(totalsJson: unknown) {
      const totals = totalsJson as Record<string, unknown> | null;
      if (!totals) return 0;
      if (typeof totals.total === 'number') return Number(totals.total);
      if (typeof totals.grandTotal === 'number') return Number(totals.grandTotal);
      return 0;
    }

    const { data } = await app.cache.fetch({
      key: cacheKey,
      ttl: 300,
      loader: async () => {
        const { start, end } = resolveRange(query.period);

        const proposals = await app.prisma.proposal.findMany({
          where: {
            accountId: request.user.accountId,
            status: 'ACCEPTED',
            createdAt: {
              gte: start.toDate(),
              lte: end.toDate(),
            },
          },
          select: {
            createdById: true,
            totalsJson: true,
            createdBy: {
              select: {
                id: true,
                fullName: true,
                email: true,
                department: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        const ranking = proposals.reduce<Record<string, {
          memberId: string;
          name: string;
          email: string | null;
          department: string | null;
          acceptedProposals: number;
          totalValue: number;
        }>>((acc, proposal) => {
          if (!proposal.createdById || !proposal.createdBy) {
            return acc;
          }

          const key = proposal.createdById;
          if (!acc[key]) {
            acc[key] = {
              memberId: key,
              name: proposal.createdBy.fullName ?? proposal.createdBy.email,
              email: proposal.createdBy.email,
              department: proposal.createdBy.department?.name ?? null,
              acceptedProposals: 0,
              totalValue: 0,
            };
          }

          acc[key].acceptedProposals += 1;
          acc[key].totalValue += getNumericTotal(proposal.totalsJson);
          return acc;
        }, {});

        const entries = Object.values(ranking).sort((a, b) => {
          if (b.totalValue !== a.totalValue) {
            return b.totalValue - a.totalValue;
          }
          return b.acceptedProposals - a.acceptedProposals;
        });

        return {
          period: query.period,
          range: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          entries,
        };
      },
    });

    return reply.send({ data });
  });

  app.post('/departments', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const body = createDepartmentSchema.parse(request.body);

    const preset = body.permissionPreset;
    const name = body.name.trim();
    const baseMap = preset === 'custom'
      ? createPresetPermissionMap('none')
      : createPresetPermissionMap(preset as Exclude<DepartmentPresetInput, 'custom'>);
    const permissionMap = applyPermissionOverrides(clonePermissionMap(baseMap), body.permissions ?? undefined);

    const slug = await generateDepartmentSlug(request.user.accountId, name, app.prisma);
    const description = body.description?.trim();

    const department = await app.prisma.department.create({
      data: {
        accountId: request.user.accountId,
        name,
        slug,
        description: description ? description : null,
        permissionPreset: toDbPreset(preset),
        permissions: {
          create: PERMISSION_KEYS.map((key) => ({
            module: PERMISSION_KEY_TO_MODULE[key],
            canView: permissionMap[key].view,
            canEdit: permissionMap[key].edit,
          })),
        },
      },
      include: { permissions: true },
    });

    await app.prisma.auditEvent.create({
      data: {
        accountId: request.user.accountId,
        userId: request.user.sub,
        action: 'department.created',
        entityType: 'Department',
        entityId: department.id,
        summary: `Departamento ${department.name} criado`,
        metadataJson: {
          preset,
        },
      },
    });

    return reply.code(201).send({ data: serializeDepartment(department) });
  });

  app.put('/departments/:id', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);
    const body = updateDepartmentSchema.parse(request.body);

    const existing = await app.prisma.department.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId,
      },
      include: { permissions: true },
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Departamento não encontrado.' });
    }

    const currentPreset = fromDbPreset(existing.permissionPreset);
    const targetPreset = body.permissionPreset ?? currentPreset;

    const currentMap = mapFromDb(existing.permissions, 'none');
    let permissionMap: PermissionMap;

    if (targetPreset === 'custom') {
      const base = clonePermissionMap(currentMap);
      permissionMap = applyPermissionOverrides(base, body.permissions ?? undefined);
    } else {
      const base = createPresetPermissionMap(targetPreset as Exclude<DepartmentPresetInput, 'custom'>);
      permissionMap = applyPermissionOverrides(clonePermissionMap(base), body.permissions ?? undefined);
    }

    const updates: Parameters<typeof app.prisma.department.update>[0]['data'] = {};

    if (body.name) {
      updates.name = body.name.trim();
    }

    if (body.description !== undefined) {
      const trimmed = body.description?.trim();
      updates.description = trimmed ? trimmed : null;
    }

    updates.permissionPreset = toDbPreset(targetPreset);

    await app.prisma.department.update({
      where: { id: existing.id },
      data: updates,
    });

    await Promise.all(
      PERMISSION_KEYS.map((key) =>
        app.prisma.departmentPermission.upsert({
          where: {
            departmentId_module: {
              departmentId: existing.id,
              module: PERMISSION_KEY_TO_MODULE[key],
            },
          },
          create: {
            departmentId: existing.id,
            module: PERMISSION_KEY_TO_MODULE[key],
            canView: permissionMap[key].view,
            canEdit: permissionMap[key].edit,
          },
          update: {
            canView: permissionMap[key].view,
            canEdit: permissionMap[key].edit,
          },
        }),
      ),
    );

    const updated = await app.prisma.department.findUnique({
      where: { id: existing.id },
      include: { permissions: true },
    });

    if (!updated) {
      request.log.error({ departmentId: existing.id }, 'Departamento não localizado após atualização');
      return reply.status(500).send({ message: 'Falha ao recarregar o departamento atualizado.' });
    }

    await app.prisma.auditEvent.create({
      data: {
        accountId: request.user.accountId,
        userId: request.user.sub,
        action: 'department.updated',
        entityType: 'Department',
        entityId: existing.id,
        summary: `Departamento ${updated.name} atualizado`,
        metadataJson: {
          preset: targetPreset,
          updatedFields: [
            ...(body.name ? ['name'] : []),
            ...(body.description !== undefined ? ['description'] : []),
            ...(body.permissionPreset ? ['permissionPreset'] : []),
            ...(body.permissions ? ['permissions'] : []),
          ],
        },
      },
    });

    return reply.send({ data: serializeDepartment(updated) });
  });

  app.delete('/departments/:id', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const department = await app.prisma.department.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId,
      },
      include: {
        permissions: true,
      },
    });

    if (!department) {
      return reply.status(404).send({ message: 'Departamento não encontrado.' });
    }

    const membersUsingDepartment = await app.prisma.user.count({
      where: { departmentId: department.id },
    });

    await app.prisma.$transaction([
      app.prisma.user.updateMany({
        where: { departmentId: department.id },
        data: { departmentId: null },
      }),
      app.prisma.departmentPermission.deleteMany({
        where: { departmentId: department.id },
      }),
      app.prisma.department.delete({ where: { id: department.id } }),
    ]);

    await app.prisma.auditEvent.create({
      data: {
        accountId: request.user.accountId,
        userId: request.user.sub,
        action: 'department.deleted',
        entityType: 'Department',
        entityId: department.id,
        summary: `Departamento ${department.name} removido`,
        metadataJson: {
          memberCount: membersUsingDepartment,
        },
      },
    });

    return reply.status(204).send();
  });

  app.get('/invite/preview', async (request, reply) => {
    const query = invitePreviewSchema.parse(request.query);

    const tokenHash = hashInviteToken(query.token);
    const invitee = await app.prisma.user.findFirst({
      where: {
        inviteTokenHash: tokenHash,
      },
      include: {
        account: true,
      },
    });

    if (!invitee) {
      return reply.status(404).send({ message: 'Convite não encontrado.' });
    }

    if (invitee.isActive) {
      return reply.status(400).send({ message: 'Convite já foi aceito.' });
    }

    if (!invitee.inviteTokenExpiresAt || dayjs(invitee.inviteTokenExpiresAt).isBefore(dayjs())) {
      return reply.status(410).send({ message: 'Convite expirado. Solicite um novo convite ao administrador.' });
    }

    return reply.send({
      data: {
        email: invitee.email,
        fullName: invitee.fullName,
        account: {
          id: invitee.account.id,
          name: invitee.account.name,
          slug: invitee.account.slug,
        },
      },
    });
  });

  app.post('/invite/accept', async (request, reply) => {
    const body = acceptInviteSchema.parse(request.body);

    const tokenHash = hashInviteToken(body.token);
    const invitee = await app.prisma.user.findFirst({
      where: {
        inviteTokenHash: tokenHash,
      },
      include: {
        account: true,
      },
    });

    if (!invitee) {
      return reply.status(404).send({ message: 'Convite não encontrado.' });
    }

    if (invitee.isActive) {
      return reply.status(400).send({ message: 'Convite já foi utilizado.' });
    }

    if (!invitee.inviteTokenExpiresAt || dayjs(invitee.inviteTokenExpiresAt).isBefore(dayjs())) {
      return reply.status(410).send({ message: 'Convite expirado. Solicite um novo convite ao administrador.' });
    }

    const passwordHash = await argon2.hash(body.password);

    await app.prisma.user.update({
      where: { id: invitee.id },
      data: {
        passwordHash,
        fullName: body.fullName ?? invitee.fullName,
        isActive: true,
        inviteTokenHash: null,
        inviteTokenExpiresAt: null,
        acceptedAt: new Date(),
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        accountId: invitee.accountId,
        userId: invitee.id,
        action: 'user.invite.accepted',
        entityType: 'User',
        entityId: invitee.id,
        summary: `Convite aceito por ${invitee.email}`,
        metadataJson: {
          inviteeEmail: invitee.email,
          inviteAcceptedAt: new Date().toISOString(),
          invitedById: invitee.invitedById,
        },
      },
    });

    return reply.send({
      data: {
        email: invitee.email,
        account: {
          id: invitee.account.id,
          name: invitee.account.name,
          slug: invitee.account.slug,
        },
      },
    });
  });

  app.post('/members', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const body = createMemberSchema.parse(request.body);

    if (body.departmentId) {
      const departmentExists = await app.prisma.department.findFirst({
        where: {
          id: body.departmentId,
          accountId: request.user.accountId,
        },
      });

      if (!departmentExists) {
        return reply.status(400).send({ message: 'Departamento inválido.' });
      }
    }

    const existingUser = await app.prisma.user.findFirst({
      where: {
        accountId: request.user.accountId,
        email: body.email.toLowerCase(),
      },
    });

    if (existingUser) {
      return reply.status(409).send({ message: 'Usuário já cadastrado com este e-mail.' });
    }

    const temporaryPassword = randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(temporaryPassword);
    const inviteToken = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const inviteTokenHash = hashInviteToken(inviteToken);
    const inviteTokenExpiresAt = dayjs().add(INVITE_EXPIRATION_DAYS, 'day').toDate();
    const invitedAt = new Date();

    const member = await app.prisma.user.create({
      data: {
        accountId: request.user.accountId,
        email: body.email.toLowerCase(),
        passwordHash,
        role: 'MEMBER',
        fullName: body.fullName ? body.fullName.trim() : null,
        jobTitle: body.jobTitle ? body.jobTitle.trim() : null,
        departmentId: body.departmentId ?? null,
        isActive: false,
        invitedById: request.user.sub,
        inviteTokenHash,
        inviteTokenExpiresAt,
        invitedAt,
      },
      include: {
        account: {
          select: { name: true },
        },
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        accountId: request.user.accountId,
        userId: request.user.sub,
        action: 'user.invited',
        entityType: 'User',
        entityId: member.id,
        summary: `Convite enviado para ${member.email}`,
        metadataJson: {
          inviteeEmail: member.email,
          fullName: member.fullName,
          departmentId: member.departmentId,
        },
      },
    });

    const inviteUrl = `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/accept-invite?token=${inviteToken}`;

    const inviter = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { fullName: true },
    });

    const emailSent = await sendInviteEmail({
      to: member.email,
      inviteUrl,
      accountName: member.account?.name ?? 'Seu workspace',
      invitedBy: inviter?.fullName ?? null,
      logger: request.log,
    });

    await app.cache.invalidatePrefix(
      app.cache.buildPrefix({
        resource: CACHE_RESOURCES.TEAM_RANKING,
        accountId: request.user.accountId,
      }),
    );

    request.log.info({ invitee: member.email, emailSent }, 'Invitation generated');

    return reply.code(201).send({
      data: {
        id: member.id,
        email: member.email,
        role: member.role,
        fullName: member.fullName,
        jobTitle: member.jobTitle,
        departmentId: member.departmentId,
        isActive: member.isActive,
        inviteUrl,
        inviteTokenExpiresAt,
        invitedAt,
        emailSent,
      },
    });
  });

  app.post('/members/:id/invite-link', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = inviteLinkBodySchema.parse(request.body ?? {});

    const member = await app.prisma.user.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId,
      },
      include: {
        account: {
          select: { name: true },
        },
      },
    });

    if (!member) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }

    if (member.isActive) {
      return reply.status(400).send({ message: 'Usuário já ativado.' });
    }

    const inviteToken = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const inviteTokenHash = hashInviteToken(inviteToken);
    const inviteTokenExpiresAt = dayjs().add(INVITE_EXPIRATION_DAYS, 'day').toDate();
    const invitedAt = new Date();

    await app.prisma.user.update({
      where: { id: member.id },
      data: {
        inviteTokenHash,
        inviteTokenExpiresAt,
        invitedAt,
      },
    });

    const inviteUrl = `${env.FRONTEND_BASE_URL.replace(/\/$/, '')}/accept-invite?token=${inviteToken}`;

    let emailSent = false;
    if (body.sendEmail) {
      const inviter = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
        select: { fullName: true },
      });

      emailSent = await sendInviteEmail({
        to: member.email,
        inviteUrl,
        accountName: member.account?.name ?? 'Seu workspace',
        invitedBy: inviter?.fullName ?? null,
        logger: request.log,
      });
    }

    return reply.send({
      data: {
        inviteUrl,
        inviteTokenExpiresAt,
        invitedAt,
        emailSent,
      },
    });
  });

  app.delete('/members/:id', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const member = await app.prisma.user.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
      },
    });

    if (!member) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }

    if (member.isActive) {
      return reply.status(400).send({ message: 'Não é possível remover usuários ativos.' });
    }

    await app.prisma.$transaction([
      app.prisma.auditEvent.create({
        data: {
          accountId: request.user.accountId,
          userId: request.user.sub,
          action: 'user.invite.deleted',
          entityType: 'User',
          entityId: member.id,
          summary: `Convite removido para ${member.email}`,
          metadataJson: {
            inviteeEmail: member.email,
          },
        },
      }),
      app.prisma.user.delete({ where: { id: member.id } }),
    ]);

    await app.cache.invalidatePrefix(
      app.cache.buildPrefix({
        resource: CACHE_RESOURCES.TEAM_RANKING,
        accountId: request.user.accountId,
      }),
    );

    return reply.status(204).send();
  });

  app.put('/members/:id', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);
    const body = updateMemberSchema.parse(request.body);

    if (body.departmentId) {
      const departmentExists = await app.prisma.department.findFirst({
        where: {
          id: body.departmentId,
          accountId: request.user.accountId,
        },
      });

      if (!departmentExists) {
        return reply.status(400).send({ message: 'Departamento inválido.' });
      }
    }

    const member = await app.prisma.user.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId,
      },
    });

    if (!member) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }

    const alterandoProprioAcesso = body.role === 'MEMBER' || body.isActive === false;
    if (member.id === request.user.sub && alterandoProprioAcesso) {
      return reply.status(400).send({ message: 'Você não pode remover o seu próprio acesso de proprietário.' });
    }

    const updateData: Parameters<typeof app.prisma.user.update>[0]['data'] = {};

    if (body.fullName) {
      updateData.fullName = body.fullName;
    }

    if (body.jobTitle !== undefined) {
      updateData.jobTitle = body.jobTitle;
    }

    if (body.departmentId !== undefined) {
      updateData.departmentId = body.departmentId;
    }

    if (body.role) {
      updateData.role = body.role;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    const updated = await app.prisma.user.update({
      where: { id: member.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        jobTitle: true,
        departmentId: true,
        isActive: true,
        createdAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await app.prisma.auditEvent.create({
      data: {
        accountId: request.user.accountId,
        userId: request.user.sub,
        action: 'user.updated',
        entityType: 'User',
        entityId: updated.id,
        summary: `Dados do membro ${updated.email} atualizados`,
        metadataJson: {
          updatedFields: Object.keys(updateData),
        },
      },
    });

    return reply.send({ data: updated });
  });
};

export default teamRoutes;
