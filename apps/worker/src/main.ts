import { Queue, Worker } from 'bullmq';
import { pino } from 'pino';
import env from '@cota/config';
import { notificarProposta, prisma } from '@cota/db';
import { createPdfJobProcessor } from '@cota/pdf';

import { registrarPdfPronto } from './pdf-pronto.js';

const logger = pino({ level: env.LOG_LEVEL });

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
};

const pdfQueueName = `${env.QUEUE_PREFIX}-pdf-generation`;

const pdfWorker = new Worker(pdfQueueName, createPdfJobProcessor({ logger }), {
  connection,
  concurrency: 2,
});

pdfWorker.on('completed', async (job, result) => {
  logger.info({ jobId: job.id }, 'PDF job completed');
  if (!result?.pdfObjectKey) {
    return;
  }
  await registrarPdfPronto(
    { prisma, logger, notificar: (proposalId) => notificarProposta(prisma, proposalId, 'proposalPdfReady') },
    { id: job.id, proposalId: job.data.proposalId },
    result.pdfObjectKey,
  );
});

pdfWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'PDF job failed');
});

const pdfQueue = new Queue(pdfQueueName, { connection });

async function shutdown() {
  logger.info('Shutting down worker');
  await pdfWorker.close();
  await pdfQueue.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

logger.info('Worker started');
