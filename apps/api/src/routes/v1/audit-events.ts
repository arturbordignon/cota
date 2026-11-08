import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@cota/db';

const listQuerySchema = z.object({
  search: z.string().optional(),
  category: z
    .enum(['proposal', 'department', 'notifications', 'billing', 'user', 'system'])
    .optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

type Categoria = 'proposal' | 'department' | 'notifications' | 'billing' | 'user' | 'system';

// Sign-ins and the account itself belong with the people who use it; anything
// that matches no category is "system".
const PREFIXOS: Record<Exclude<Categoria, 'system'>, string[]> = {
  proposal: ['proposal.'],
  department: ['department.'],
  notifications: ['notifications.'],
  billing: ['billing.'],
  user: ['user.', 'auth.', 'account.'],
};

function resolveCategory(action: string): Categoria {
  for (const [categoria, prefixos] of Object.entries(PREFIXOS)) {
    if (prefixos.some((prefixo) => action.startsWith(prefixo))) {
      return categoria as Categoria;
    }
  }
  return 'system';
}

function filtroDaCategoria(categoria: Categoria): Prisma.AuditEventWhereInput {
  if (categoria === 'system') {
    const todos = Object.values(PREFIXOS).flat();
    return { NOT: { OR: todos.map((prefixo) => ({ action: { startsWith: prefixo } })) } };
  }
  return { OR: PREFIXOS[categoria].map((prefixo) => ({ action: { startsWith: prefixo } })) };
}

const auditEventRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const query = listQuerySchema.parse(request.query);

    const where: Prisma.AuditEventWhereInput = {
      accountId: request.user.accountId,
    };

    const condicoes: Prisma.AuditEventWhereInput[] = [];
    if (query.category) {
      condicoes.push(filtroDaCategoria(query.category));
    }

    if (query.search) {
      const search = query.search.trim();
      condicoes.push({
        OR: [
          { summary: { contains: search, mode: 'insensitive' } },
          { action: { contains: search, mode: 'insensitive' } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }

    if (condicoes.length > 0) {
      where.AND = condicoes;
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
            fullName: true,
          },
        },
      },
    });

    const payload = events.map((event) => ({
      id: event.id,
      actor: event.user?.fullName ?? event.user?.email ?? 'Sistema',
      actorEmail: event.user?.email ?? null,
      event: event.action,
      category: resolveCategory(event.action),
      summary: event.summary,
      summaryKey: (event.metadataJson as Record<string, unknown> | null)?.summaryKey ?? null,
      summaryParams:
        (event.metadataJson as Record<string, unknown> | null)?.summaryParams ?? undefined,
      metadata: event.metadataJson,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      createdAt: event.createdAt,
    }));

    return reply.send({ data: payload });
  });
};

export default auditEventRoutes;
