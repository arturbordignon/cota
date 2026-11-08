import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

type Metadados = { key?: string; params?: Record<string, string>; link?: string | null } | null;

// Each person sees only the notifications addressed to them.
const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const onde = { accountId: request.user.accountId, recipientId: request.user.sub };

    const [notificacoes, naoLidas] = await Promise.all([
      app.prisma.notification.findMany({
        where: onde,
        orderBy: { createdAt: 'desc' },
        take: query.limit,
      }),
      app.prisma.notification.count({ where: { ...onde, isRead: false } }),
    ]);

    return reply.send({
      data: notificacoes.map((notificacao) => {
        const metadados = notificacao.metadataJson as Metadados;
        return {
          id: notificacao.id,
          key: metadados?.key ?? null,
          params: metadados?.params ?? {},
          link: metadados?.link ?? null,
          title: notificacao.title,
          body: notificacao.body,
          tone: notificacao.tone.toLowerCase(),
          isRead: notificacao.isRead,
          createdAt: notificacao.createdAt,
        };
      }),
      unreadCount: naoLidas,
    });
  });

  app.post('/read-all', async (request, reply) => {
    await app.prisma.notification.updateMany({
      where: { accountId: request.user.accountId, recipientId: request.user.sub, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return reply.status(204).send();
  });

  app.post('/:id/read', async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const resultado = await app.prisma.notification.updateMany({
      where: { id: params.id, accountId: request.user.accountId, recipientId: request.user.sub },
      data: { isRead: true, readAt: new Date() },
    });
    if (resultado.count === 0) {
      return reply.status(404).send({ message: 'Notification not found' });
    }
    return reply.status(204).send();
  });
};

export default notificationRoutes;
