import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import { randomBytes } from 'crypto';

const PERMISSION_MODULES = [
  'DASHBOARD',
  'PROPOSALS',
  'TEMPLATES',
  'PROSPECTS',
  'CRM',
  'REPORTS',
  'PLAN',
  'CLIENTS',
  'SERVICES'
] as const;

const createMemberSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  jobTitle: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  role: z.enum(['OWNER', 'MEMBER']).default('MEMBER')
});

const updateMemberSchema = z.object({
  fullName: z.string().min(2).optional(),
  jobTitle: z.string().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  role: z.enum(['OWNER', 'MEMBER']).optional(),
  isActive: z.boolean().optional()
});

const teamRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const [departments, members] = await Promise.all([
      app.prisma.department.findMany({
        where: { accountId: request.user.accountId },
        include: { permissions: true },
        orderBy: { name: 'asc' }
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
          department: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const departmentPayload = departments.map((department) => {
      const permissions = PERMISSION_MODULES.reduce<Record<string, { view: boolean; edit: boolean }>>(
        (acc, module) => {
          const entry = department.permissions.find((permission) => permission.module === module);
          acc[module.toLowerCase()] = {
            view: entry?.canView ?? false,
            edit: entry?.canEdit ?? false
          };
          return acc;
        },
        {}
      );

      return {
        id: department.id,
        name: department.name,
        description: department.description,
        permissionPreset: department.permissionPreset,
        permissions
      };
    });

    const memberPayload = members.map((member) => ({
      id: member.id,
      email: member.email,
      role: member.role,
      fullName: member.fullName,
      jobTitle: member.jobTitle,
      departmentId: member.departmentId,
      department: member.department,
      isActive: member.isActive,
      createdAt: member.createdAt
    }));

    return reply.send({
      data: {
        departments: departmentPayload,
        members: memberPayload
      }
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
          accountId: request.user.accountId
        }
      });

      if (!departmentExists) {
        return reply.status(400).send({ message: 'Departamento inválido.' });
      }
    }

    const existing = await app.prisma.user.findFirst({
      where: {
        accountId: request.user.accountId,
        email: body.email.toLowerCase()
      }
    });

    if (existing) {
      return reply.status(409).send({ message: 'Usuário já cadastrado com este e-mail.' });
    }

    const temporaryPassword = randomBytes(16).toString('hex');
    const passwordHash = await argon2.hash(temporaryPassword);

    const member = await app.prisma.user.create({
      data: {
        accountId: request.user.accountId,
        email: body.email.toLowerCase(),
        passwordHash,
        role: body.role,
        fullName: body.fullName,
        jobTitle: body.jobTitle,
        departmentId: body.departmentId ?? null,
        isActive: false
      }
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
          departmentId: member.departmentId
        }
      }
    });

    return reply.code(201).send({
      data: {
        id: member.id,
        email: member.email,
        role: member.role,
        fullName: member.fullName,
        jobTitle: member.jobTitle,
        departmentId: member.departmentId,
        isActive: member.isActive
      }
    });
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
          accountId: request.user.accountId
        }
      });

      if (!departmentExists) {
        return reply.status(400).send({ message: 'Departamento inválido.' });
      }
    }

    const member = await app.prisma.user.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId
      }
    });

    if (!member) {
      return reply.status(404).send({ message: 'Usuário não encontrado.' });
    }

    const updateData: Record<string, unknown> = {};

    if (body.fullName !== undefined) {
      updateData.fullName = body.fullName;
    }

    if (body.jobTitle !== undefined) {
      updateData.jobTitle = body.jobTitle;
    }

    if (body.departmentId !== undefined) {
      updateData.departmentId = body.departmentId;
    }

    if (body.role !== undefined) {
      updateData.role = body.role;
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length > 0) {
      await app.prisma.user.update({
        where: { id: member.id },
        data: updateData
      });
    }

    await app.prisma.auditEvent.create({
      data: {
        accountId: request.user.accountId,
        userId: request.user.sub,
        action: 'user.updated',
        entityType: 'User',
        entityId: member.id,
        summary: `Usuário ${member.email} atualizado`,
        metadataJson: {
          updatedFields: Object.keys(body),
          performedBy: request.user.sub
        }
      }
    });

    return reply.status(204).send();
  });
};

export default teamRoutes;
