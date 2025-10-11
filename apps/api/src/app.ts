import fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import redis from '@fastify/redis';

import env from '@crane/config';
import i18nPlugin from './plugins/i18n.js';
import prismaPlugin from './plugins/prisma.js';
import queuesPlugin from './plugins/queues.js';
import seedPlans from './plugins/seed-plans.js';
import cachePlugin from './plugins/cache.js';
import authRoutes from './routes/v1/auth.js';
import templateRoutes from './routes/v1/templates.js';
import proposalRoutes from './routes/v1/proposals.js';
import clientRoutes from './routes/v1/clients.js';
import assetRoutes from './routes/v1/assets.js';
import billingRoutes from './routes/v1/billing.js';
import reportsRoutes from './routes/v1/reports.js';
import equipmentRoutes from './routes/v1/equipment.js';
import teamRoutes from './routes/v1/team.js';
import auditEventRoutes from './routes/v1/audit-events.js';
import pipelineRoutes from './routes/v1/pipeline.js';

export async function buildServer() {
  const app = fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await app.register(rateLimit as any, {
    max: 200,
    timeWindow: '1 minute',
    addHeaders: {
      'x-ratelimit-limit': false,
      'x-ratelimit-remaining': false,
      'x-ratelimit-reset': false,
    },
  });

  // await app.register(cors, { origin: true, credentials: true });
  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Accept-Language',
    ],
    exposedHeaders: ['Content-Language'],
  });
  await app.register(helmet);
  await app.register(multipart, {
    limits: { files: 5, fileSize: 15 * 1024 * 1024 },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'CraneProposals API',
        description: 'API for crane proposal SaaS',
        version: '0.1.0',
      },
    },
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await app.register(redis, {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
  });

  await app.register(cachePlugin);

  await app.register(prismaPlugin);
  await app.register(seedPlans);
  await app.register(i18nPlugin);
  await app.register(queuesPlugin);

  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: {
      expiresIn: '15m',
    },
  });

  app.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }
  });

  app.get('/health', async () => ({ status: 'ok' }));

  app.addHook('preHandler', async (request, reply) => {
    const locale = request.headers['accept-language']?.split(',')[0] ?? 'pt-BR';

    reply.header('content-language', locale);
  });

  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(clientRoutes, { prefix: '/api/v1/clients' });
  app.register(templateRoutes, { prefix: '/api/v1/templates' });
  app.register(proposalRoutes, { prefix: '/api/v1/proposals' });
  app.register(assetRoutes, { prefix: '/api/v1/assets' });
  app.register(billingRoutes, { prefix: '/api/v1/billing' });
  app.register(reportsRoutes, { prefix: '/api/v1/reports' });
  app.register(pipelineRoutes, { prefix: '/api/v1/pipeline' });
  app.register(equipmentRoutes, { prefix: '/api/v1/equipment' });
  app.register(teamRoutes, { prefix: '/api/v1/team' });
  app.register(auditEventRoutes, { prefix: '/api/v1/audit-events' });

  return app;
}
