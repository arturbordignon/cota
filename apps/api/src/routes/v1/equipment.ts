import type { FastifyPluginAsync } from 'fastify';

const equipmentRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const equipment = await app.prisma.equipment.findMany({
      where: { accountId: request.user.accountId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ data: equipment });
  });
};

export default equipmentRoutes;
