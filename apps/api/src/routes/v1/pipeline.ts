import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@crane/db';

import { invalidateReportsOverviewCache } from '../../utils/cache.js';

const moveLeadSchema = z.object({
  stageId: z.string().uuid()
});

const updateStageSchema = z.object({
  name: z.string().min(2).optional(),
  color: z.enum(['info', 'warning', 'success', 'neutral']).optional(),
});

const reorderStagesSchema = z.object({
  stages: z.array(z.object({ id: z.string().uuid() })).min(1),
});

const pipelineRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/stages', async (request, reply) => {
    let stages = await app.prisma.pipelineStage.findMany({
      where: { accountId: request.user.accountId },
      orderBy: { position: 'asc' },
      include: {
        leads: {
          orderBy: { updatedAt: 'desc' },
          include: {
            proposals: {
              select: { id: true, title: true, status: true, totalsJson: true }
            }
          }
        }
      }
    });

    if (stages.length === 0) {
      const defaults = [
        { name: 'Descoberta', color: 'info', position: 0 },
        { name: 'Qualificação', color: 'warning', position: 1 },
        { name: 'Proposta enviada', color: 'info', position: 2 },
        { name: 'Fechado', color: 'success', position: 3 }
      ];

      await app.prisma.$transaction(
        defaults.map((stage) =>
          app.prisma.pipelineStage.create({
            data: {
              accountId: request.user.accountId,
              name: stage.name,
              color: stage.color,
              position: stage.position
            }
          })
        )
      );

      stages = await app.prisma.pipelineStage.findMany({
        where: { accountId: request.user.accountId },
        orderBy: { position: 'asc' },
        include: {
          leads: {
            orderBy: { updatedAt: 'desc' },
            include: {
              proposals: {
                select: { id: true, title: true, status: true, totalsJson: true }
              }
            }
          }
        }
      });
    }

    return reply.send({ data: stages });
  });

  app.patch('/leads/:id/move', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = moveLeadSchema.parse(request.body);

    const stage = await app.prisma.pipelineStage.findFirst({
      where: { id: body.stageId, accountId: request.user.accountId }
    });

    if (!stage) {
      return reply.status(404).send({ message: 'Stage not found.' });
    }

    const updated = await app.prisma.pipelineLead.updateMany({
      where: { id: params.id, accountId: request.user.accountId },
      data: { stageId: stage.id }
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: 'Lead not found.' });
    }

    await invalidateReportsOverviewCache(app, request.user.accountId);

    return reply.status(204).send();
  });

  app.post('/stages', async (request, reply) => {
    const body = z
      .object({
        name: z.string().min(2),
        color: z.string().optional(),
        position: z.number().int().min(0).optional()
      })
      .parse(request.body);

    const maxPosition = await app.prisma.pipelineStage.aggregate({
      where: { accountId: request.user.accountId },
      _max: { position: true }
    });

    const stage = await app.prisma.pipelineStage.create({
      data: {
        accountId: request.user.accountId,
        name: body.name,
        color: body.color ?? 'info',
        position: body.position ?? (maxPosition._max.position ?? 0) + 1
      }
    });

    await invalidateReportsOverviewCache(app, request.user.accountId);

    return reply.code(201).send({ data: stage });
  });

  app.patch('/stages/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateStageSchema.parse(request.body);

    if (Object.keys(body).length === 0) {
      return reply.send({});
    }

    const stage = await app.prisma.pipelineStage.findFirst({
      where: { id: params.id, accountId: request.user.accountId },
    });

    if (!stage) {
      return reply.status(404).send({ message: 'Stage not found.' });
    }

    await app.prisma.pipelineStage.update({
      where: { id: stage.id },
      data: {
        name: body.name ?? stage.name,
        color: body.color ?? stage.color,
      },
    });

    await invalidateReportsOverviewCache(app, request.user.accountId);

    return reply.status(204).send();
  });

  app.patch('/stages/reorder', async (request, reply) => {
    const body = reorderStagesSchema.parse(request.body);

    const stages = await app.prisma.pipelineStage.findMany({
      where: { accountId: request.user.accountId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    if (stages.length !== body.stages.length) {
      return reply.status(400).send({ message: 'Invalid stage list.' });
    }

    const stageIds = new Set(stages.map((stage) => stage.id));
    for (const item of body.stages) {
      if (!stageIds.has(item.id)) {
        return reply.status(400).send({ message: 'Invalid stage id.' });
      }
    }

    await app.prisma.$transaction(
      body.stages.map((item, index) =>
        app.prisma.pipelineStage.update({
          where: { id: item.id },
          data: { position: index },
        }),
      ),
    );

    await invalidateReportsOverviewCache(app, request.user.accountId);

    return reply.status(204).send();
  });

  app.delete('/stages/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const stage = await app.prisma.pipelineStage.findFirst({
      where: { id: params.id, accountId: request.user.accountId },
      include: {
        _count: { select: { leads: true } },
      },
    });

    if (!stage) {
      return reply.status(404).send({ message: 'Stage not found.' });
    }

    if (stage._count.leads > 0) {
      return reply.status(400).send({ message: 'Stage has leads and cannot be removed.' });
    }

    await app.prisma.pipelineStage.delete({ where: { id: stage.id } });

    await invalidateReportsOverviewCache(app, request.user.accountId);

    return reply.status(204).send();
  });

  app.post('/leads', async (request, reply) => {
    const body = z
      .object({
        stageId: z.string().uuid(),
        companyName: z.string().min(2),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        estimatedValue: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
      .parse(request.body);

    const stage = await app.prisma.pipelineStage.findFirst({
      where: { id: body.stageId, accountId: request.user.accountId }
    });

    if (!stage) {
      return reply.status(404).send({ message: 'Stage not found.' });
    }

    const data: Prisma.PipelineLeadCreateInput = {
      account: { connect: { id: request.user.accountId } },
      stage: { connect: { id: stage.id } },
      companyName: body.companyName,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      estimatedValue: body.estimatedValue != null ? new Prisma.Decimal(body.estimatedValue) : undefined,
      notes: body.notes,
      metadataJson: null,
      proposals: { connect: [] }
    };

    const lead = await app.prisma.pipelineLead.create({ data });

    await invalidateReportsOverviewCache(app, request.user.accountId);

    return reply.code(201).send({ data: lead });
  });
};

export default pipelineRoutes;
