import type { Job } from 'bullmq';
import type { Logger } from 'pino';

export interface PdfJobData {
  proposalId: string;
  html: string;
  locale: string;
  outputKey: string;
}

export interface PdfJobResult {
  pdfObjectKey: string;
  generatedAt: string;
}

interface CreateProcessorOptions {
  logger: Logger;
}

export function createPdfJobProcessor({ logger }: CreateProcessorOptions) {
  return async function process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    logger.info({ jobId: job.id, proposalId: job.data.proposalId }, 'Rendering PDF (stub)');

    // TODO: Implement real PDF rendering with headless Chromium and upload to S3.
    // For now we return the provided key to keep the pipeline moving during early development.
    const fakeResult: PdfJobResult = {
      pdfObjectKey: job.data.outputKey,
      generatedAt: new Date().toISOString()
    };

    return fakeResult;
  };
}
