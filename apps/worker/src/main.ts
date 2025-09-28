import { Queue, Worker } from 'bullmq';
import { pino } from 'pino';
import env from '@crane/config';
import { prisma } from '@crane/db';
import { createPdfJobProcessor } from '@crane/pdf';

const logger = pino({ level: env.LOG_LEVEL });

const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined
};

const pdfQueueName = `${env.QUEUE_PREFIX}-pdf-generation`;

const pdfWorker = new Worker(
  pdfQueueName,
  createPdfJobProcessor({ logger }),
  { connection, concurrency: 2 }
);

pdfWorker.on('completed', async (job, result) => {
  logger.info({ jobId: job.id }, 'PDF job completed');
  if (result?.pdfObjectKey) {
    await prisma.proposal.update({
      where: { id: job.data.proposalId },
      data: {
        status: 'SENT',
        pdfObjectKey: result.pdfObjectKey,
        sentAt: new Date()
      }
    });
  }
});

pdfWorker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, err }, 'PDF job failed');
  if (job?.data?.proposalId) {
    await prisma.proposal.update({
      where: { id: job.data.proposalId },
      data: { status: 'DRAFT' }
    });
  }
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
