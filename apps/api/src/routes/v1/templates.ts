import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const templatePayloadSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  locale: z.enum(['pt-BR', 'en']).default('pt-BR'),
  category: z.string().optional(),
  inputSchemaJson: z.record(z.any()),
  defaultDataJson: z.record(z.any()).default({}),
  htmlBody: z.string().min(10),
  pdfLayoutOptionsJson: z.record(z.any()).default({}),
  isActive: z.boolean().default(true)
});

const listQuerySchema = z
  .object({
    scope: z.enum(['all', 'system', 'custom']).default('all'),
    locale: z.enum(['pt-BR', 'en']).optional()
  })
  .default({ scope: 'all' as const });

function buildCacheKey(accountId: string, scope: string, locale?: string) {
  return `templates:${accountId}:${scope}:${locale ?? 'any'}`;
}

async function invalidateTemplateCache(app: FastifyInstance, accountId: string) {
  const scopes = ['all', 'system', 'custom'];
  const locales = ['pt-BR', 'en'];
  const keys = scopes.flatMap((scope) => [
    buildCacheKey(accountId, scope),
    ...locales.map((locale) => buildCacheKey(accountId, scope, locale))
  ]);
  await Promise.all(keys.map((key) => app.redis.del(key)));
}

const templateRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const cacheKey = buildCacheKey(request.user.accountId, query.scope, query.locale);

    const cached = await app.redis.get(cacheKey);
    if (cached) {
      return reply.send({ data: JSON.parse(cached), cached: true });
    }

    const filters = [] as Array<Record<string, unknown>>;
    if (query.scope === 'system') {
      filters.push({ accountId: null, isActive: true });
    } else if (query.scope === 'custom') {
      filters.push({ accountId: request.user.accountId });
    } else {
      filters.push({ accountId: null, isActive: true });
      filters.push({ accountId: request.user.accountId });
    }

    const templates = await app.prisma.proposalTemplate.findMany({
      where: {
        OR: filters,
        ...(query.locale ? { locale: query.locale } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    await app.redis.set(cacheKey, JSON.stringify(templates), 'EX', 120);

    return reply.send({ data: templates, cached: false });
  });

  app.post('/', async (request, reply) => {
    const body = templatePayloadSchema.parse(request.body);

    const template = await app.prisma.proposalTemplate.create({
      data: {
        ...body,
        accountId: request.user.accountId
      }
    });

    await invalidateTemplateCache(app, request.user.accountId);

    return reply.code(201).send({ data: template });
  });

  app.get('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const template = await app.prisma.proposalTemplate.findFirst({
      where: {
        id: params.id,
        OR: [
          { accountId: request.user.accountId },
          { accountId: null }
        ]
      }
    });

    if (!template) {
      return reply.status(404).send({ message: 'Template not found' });
    }

    return reply.send({ data: template });
  });

  app.put('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);
    const body = templatePayloadSchema.partial().parse(request.body);

    const updated = await app.prisma.proposalTemplate.updateMany({
      where: {
        id: params.id,
        accountId: request.user.accountId
      },
      data: body
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: 'Template not found' });
    }

    await invalidateTemplateCache(app, request.user.accountId);

    const template = await app.prisma.proposalTemplate.findUnique({ where: { id: params.id } });
    return reply.send({ data: template });
  });

  app.delete('/:id', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const updated = await app.prisma.proposalTemplate.updateMany({
      where: {
        id: params.id,
        accountId: request.user.accountId
      },
      data: { isActive: false }
    });

    if (updated.count === 0) {
      return reply.status(404).send({ message: 'Template not found' });
    }

    await invalidateTemplateCache(app, request.user.accountId);

    return reply.status(204).send();
  });
};

export default templateRoutes;
