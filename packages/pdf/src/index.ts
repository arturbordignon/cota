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

const FAIXAS_PRIVADAS_IPV4 = [/^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

// Template HTML is written by users, so the browser that prints it may only
// load inline data, the bucket and public https addresses: never loopback,
// private networks, cloud metadata or internal names.
function enderecoInterno(hostname: string) {
  const nome = hostname.toLowerCase();
  if (nome === 'localhost' || nome.endsWith('.localhost') || nome.endsWith('.internal') || nome.endsWith('.local')) {
    return true;
  }
  if (nome.startsWith('[')) {
    return true;
  }
  return FAIXAS_PRIVADAS_IPV4.some((faixa) => faixa.test(nome));
}

export function requisicaoPermitida(url: string) {
  if (url.startsWith('data:')) {
    return true;
  }
  if (url.startsWith(`${env.S3_ENDPOINT.replace(/\/$/, '')}/`)) {
    return true;
  }
  let endereco: URL;
  try {
    endereco = new URL(url);
  } catch {
    return false;
  }
  if (endereco.protocol !== 'https:') {
    return false;
  }
  return !enderecoInterno(endereco.hostname);
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

    // "load" waits for every image (including the signed photo URLs) before printing.
    await pagina.setContent(html, { waitUntil: 'load', timeout: env.PDF_RENDER_TIMEOUT_MS });
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
