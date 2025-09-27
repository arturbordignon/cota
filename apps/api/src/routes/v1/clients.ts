import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const createClientSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  notes: z.string().optional()
});

const updateClientSchema = createClientSchema.partial();

const clientRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const clients = await app.prisma.client.findMany({
      where: { accountId: request.user.accountId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ data: clients });
  });

  app.post('/', async (request, reply) => {
    const body = createClientSchema.parse(request.body);

    const client = await app.prisma.client.create({
      data: {
        ...body,
        accountId: request.user.accountId
      }
    });

    return reply.code(201).send({ data: client });
  });

  app.get('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const client = await app.prisma.client.findFirst({
      where: { id: params.id, accountId: request.user.accountId }
    });

    if (!client) {
      return reply.status(404).send({ message: 'Client not found' });
    }

    return reply.send({ data: client });
  });

  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);
    const body = updateClientSchema.parse(request.body);

    const result = await app.prisma.client.updateMany({
      where: { id: params.id, accountId: request.user.accountId },
      data: body
    });

    if (result.count === 0) {
      return reply.status(404).send({ message: 'Client not found' });
    }

    const updated = await app.prisma.client.findUnique({ where: { id: params.id } });
    return reply.send({ data: updated });
  });

  app.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const deleted = await app.prisma.client.deleteMany({
      where: { id: params.id, accountId: request.user.accountId }
    });

    if (deleted.count === 0) {
      return reply.status(404).send({ message: 'Client not found' });
    }

    return reply.status(204).send();
  });
};

export default clientRoutes;
