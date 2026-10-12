import type { Job } from 'bullmq';
import type { Logger } from 'pino';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import env from '@cota/config';
import { uploadObject } from '@cota/storage';

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

async function buscarCaminhoNavegador() {
  if (env.CHROMIUM_EXECUTABLE_PATH) {
    return env.CHROMIUM_EXECUTABLE_PATH;
  }
  return chromium.executablePath();
}

function buscarArgumentosNavegador() {
  if (env.CHROMIUM_EXECUTABLE_PATH) {
    return [];
  }
  return chromium.args;
}

function requisicaoPermitida(url: string) {
  if (url.startsWith('data:')) {
    return true;
  }
  if (url.startsWith(env.S3_ENDPOINT)) {
    return true;
  }
  if (url.startsWith('https://')) {
    return true;
  }
  return false;
}

async function gerarPdf(html: string) {
  const navegador = await puppeteer.launch({
    executablePath: await buscarCaminhoNavegador(),
    args: buscarArgumentosNavegador(),
    headless: true,
  });

  try {
    const pagina = await navegador.newPage();
    await pagina.setJavaScriptEnabled(false);
    await pagina.setRequestInterception(true);
    pagina.on('request', (requisicao) => {
      if (requisicaoPermitida(requisicao.url())) {
        requisicao.continue();
        return;
      }
      requisicao.abort();
    });

    await pagina.setContent(html, { waitUntil: 'networkidle0', timeout: env.PDF_RENDER_TIMEOUT_MS });
    return await pagina.pdf({ format: 'A4', printBackground: true });
  } finally {
    await navegador.close();
  }
}

export function createPdfJobProcessor({ logger }: CreateProcessorOptions) {
  return async function process(job: Job<PdfJobData>): Promise<PdfJobResult> {
    logger.info({ jobId: job.id, proposalId: job.data.proposalId }, 'Rendering PDF');

    const arquivo = await gerarPdf(job.data.html);
    await uploadObject({ key: job.data.outputKey, body: arquivo, contentType: 'application/pdf' });

    return {
      pdfObjectKey: job.data.outputKey,
      generatedAt: new Date().toISOString()
    };
  };
}
