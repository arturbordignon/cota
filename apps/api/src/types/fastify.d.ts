import 'fastify';
import type { i18n } from '@crane/i18n';
import type { Queue } from 'bullmq';
import type { FastifyRedis } from '@fastify/redis';
import type { PdfJobData, PdfJobResult } from '@crane/pdf';

declare module 'fastify' {
  interface FastifyInstance {
    i18n: i18n;
    i18nReady: boolean;
    prisma: import('@crane/db').PrismaClient;
    pdfQueue: Queue<PdfJobData, PdfJobResult>;
    redis: FastifyRedis;
    cache: import('../plugins/cache.js').CacheManager;
    authenticate: import('fastify').preHandlerHookHandler;
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
