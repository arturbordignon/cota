import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@crane/db';

const moveLeadSchema = z.object({
  stageId: z.string().uuid()
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
            prospect: true,
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
              prospect: true,
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

    return reply.code(201).send({ data: stage });
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
        prospectId: z.string().uuid().optional()
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
      prospect: body.prospectId ? { connect: { id: body.prospectId } } : undefined,
      proposals: { connect: [] }
    };

    const lead = await app.prisma.pipelineLead.create({ data });

    return reply.code(201).send({ data: lead });
  });
};

export default pipelineRoutes;
