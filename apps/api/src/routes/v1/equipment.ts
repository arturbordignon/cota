import type { FastifyPluginAsync } from 'fastify';
import { Prisma } from '@cota/db';
import { z } from 'zod';
import { exigirPermissao } from '../../utils/permissions.js';

const createEquipmentSchema = z.object({
  name: z.string().min(2),
  capacityTons: z.number().nonnegative().optional(),
  dailyRate: z.number().nonnegative().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const updateEquipmentSchema = createEquipmentSchema.partial();

const equipmentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', exigirPermissao('services'));

  app.get('/', async (request, reply) => {
    const equipment = await app.prisma.equipment.findMany({
      where: { accountId: request.user.accountId },
      orderBy: { createdAt: 'desc' },
    });

    return reply.send({ data: equipment });
  });

  app.post('/', async (request, reply) => {
    const body = createEquipmentSchema.parse(request.body);

    const specs: Record<string, string> = {};
    if (body.description?.trim()) specs.description = body.description.trim();
    if (body.notes?.trim()) specs.notes = body.notes.trim();

    const equipment = await app.prisma.equipment.create({
      data: {
        accountId: request.user.accountId,
        name: body.name.trim(),
        capacityTons: body.capacityTons ?? null,
        dailyRate: body.dailyRate != null ? new Prisma.Decimal(body.dailyRate) : null,
        specsJson: Object.keys(specs).length > 0 ? specs : Prisma.JsonNull,
      },
    });

    return reply.code(201).send({ data: equipment });
  });

  app.put('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateEquipmentSchema.parse(request.body);

    const existing = await app.prisma.equipment.findFirst({
      where: { id: params.id, accountId: request.user.accountId },
    });

    if (!existing) {
      return reply.status(404).send({ message: 'Serviço não encontrado.' });
    }

    const data: Prisma.EquipmentUpdateInput = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.capacityTons !== undefined) data.capacityTons = body.capacityTons ?? null;
    if (body.dailyRate !== undefined) {
      data.dailyRate = body.dailyRate != null ? new Prisma.Decimal(body.dailyRate) : null;
    }

    if (body.description !== undefined || body.notes !== undefined) {
      const especificacoesAtuais = (existing.specsJson || {}) as Record<string, string | undefined>;
      const specs = {
        description: especificacoesAtuais.description,
        notes: especificacoesAtuais.notes,
      };
      if (body.description !== undefined) {
        specs.description = body.description.trim();
      }
      if (body.notes !== undefined) {
        specs.notes = body.notes.trim();
      }

      const cleaned: Record<string, string> = {};
      if (specs.description) cleaned.description = specs.description;
      if (specs.notes) cleaned.notes = specs.notes;

      data.specsJson = Object.keys(cleaned).length > 0 ? cleaned : Prisma.JsonNull;
    }

    await app.prisma.equipment.update({
      where: { id: existing.id },
      data,
    });

    const updated = await app.prisma.equipment.findUnique({ where: { id: existing.id } });

    return reply.send({ data: updated });
  });

  app.delete('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const deleted = await app.prisma.equipment.deleteMany({
      where: { id: params.id, accountId: request.user.accountId },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: 'Serviço não encontrado.' });
    }

    return reply.status(204).send();
  });
};

export default equipmentRoutes;
