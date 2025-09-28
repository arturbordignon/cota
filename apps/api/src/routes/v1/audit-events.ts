import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@crane/db';

const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z.enum(['proposal', 'department', 'notifications', 'billing', 'user', 'system']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50)
});

function resolveCategory(action: string): 'proposal' | 'department' | 'notifications' | 'billing' | 'user' | 'system' {
  if (action.startsWith('proposal.')) return 'proposal';
  if (action.startsWith('department.')) return 'department';
  if (action.startsWith('notifications.')) return 'notifications';
  if (action.startsWith('billing.')) return 'billing';
  if (action.startsWith('user.')) return 'user';
  return 'system';
}

const auditEventRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const query = listQuerySchema.parse(request.query);

    const where: Prisma.AuditEventWhereInput = {
      accountId: request.user.accountId
    };

    if (query.category) {
      where.action = {
        startsWith: `${query.category}.`
      };
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const events = await app.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      }
    });

    const payload = events.map((event) => ({
      id: event.id,
      actor: event.user?.fullName ?? event.user?.email ?? 'Sistema',
      actorEmail: event.user?.email ?? null,
      event: event.action,
      category: resolveCategory(event.action),
      summary: event.summary,
      summaryKey: (event.metadataJson as Record<string, unknown> | null)?.summaryKey ?? null,
      summaryParams: (event.metadataJson as Record<string, unknown> | null)?.summaryParams ?? undefined,
      metadata: event.metadataJson,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt
    }));

    return reply.send({ data: payload });
  });
};

export default auditEventRoutes;
