import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const listQuerySchema = z.object({
  search: z.string().optional(),
  segment: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(100)
});

const createProspectSchema = z.object({
  name: z.string().min(2),
  segment: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  opportunity: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.record(z.unknown()).optional()
});

const updateProspectSchema = createProspectSchema.partial();

const prospectsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);

    const where = {
      accountId: request.user.accountId,
      ...(query.segment ? { segment: query.segment } : {}),
      ...(query.region ? { region: query.region } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { opportunity: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
              { state: { contains: query.search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const prospects = await app.prisma.prospect.findMany({
      where,
      take: query.limit,
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ data: prospects });
  });

  app.post('/', async (request, reply) => {
    const body = createProspectSchema.parse(request.body);

    const prospect = await app.prisma.prospect.create({
      data: {
        accountId: request.user.accountId,
        name: body.name,
        segment: body.segment,
        region: body.region,
        city: body.city,
        state: body.state,
        opportunity: body.opportunity,
        email: body.email,
        phone: body.phone,
        notesJson: body.notes ?? null
      }
    });

    return reply.code(201).send({ data: prospect });
  });

  app.put('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateProspectSchema.parse(request.body);

    const updated = await app.prisma.prospect.updateMany({
      where: { id: params.id, accountId: request.user.accountId },
      data: {
        ...body,
        notesJson: body.notes ?? undefined
      }
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: 'Prospect not found.' });
    }

    const prospect = await app.prisma.prospect.findUnique({ where: { id: params.id } });
    return reply.send({ data: prospect });
  });

  app.delete('/:id', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    await app.prisma.prospect.deleteMany({
      where: { id: params.id, accountId: request.user.accountId }
    });

    return reply.status(204).send();
  });
};

export default prospectsRoutes;
