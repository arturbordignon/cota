import 'fastify';
import type { i18n } from '@cota/i18n';
import type { Queue } from 'bullmq';
import type { FastifyRedis } from '@fastify/redis';
import type { PdfJobData, PdfJobResult } from '@cota/pdf';

declare module 'fastify' {
  interface FastifyInstance {
    i18n: i18n;
    i18nReady: boolean;
    prisma: import('@cota/db').PrismaClient;
    pdfQueue: Queue<PdfJobData, PdfJobResult>;
    redis: FastifyRedis;
    cache: import('../plugins/cache.js').CacheManager;
    authenticate: (
      request: import('fastify').FastifyRequest,
      reply: import('fastify').FastifyReply,
    ) => Promise<unknown>;
  }

  interface FastifyRequest {
    user: {
      sub: string;
      accountId: string;
      role: string;
    };
    rawBody?: string;
  }
}
