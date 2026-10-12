import fp from 'fastify-plugin';
import { Queue } from 'bullmq';
import env from '@cota/config';
import type { PdfJobData, PdfJobResult } from '@cota/pdf';

declare module 'fastify' {
  interface FastifyInstance {
    pdfQueue: Queue<PdfJobData, PdfJobResult>;
  }
}

export default fp(async (app) => {
  const connection = {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined
  };

  const pdfQueueName = `${env.QUEUE_PREFIX}-pdf-generation`;

  const pdfQueue = new Queue<PdfJobData, PdfJobResult>(
    pdfQueueName,
    {
      connection
    }
  );

  app.decorate('pdfQueue', pdfQueue);

  app.addHook('onClose', async () => {
    await pdfQueue.close();
  });
});
