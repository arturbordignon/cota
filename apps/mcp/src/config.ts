import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// pnpm runs the server from apps/mcp, so besides the current folder the
// workspace root .env (two levels above src) is read too.
const raizDoProjeto = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function lerEnvArquivos() {
  for (const caminho of new Set([resolve(process.cwd(), '.env'), resolve(raizDoProjeto, '.env')])) {
    lerEnvArquivo(caminho);
  }
}

function lerEnvArquivo(caminho: string) {
  if (!existsSync(caminho)) {
    return;
  }

  const linhas = readFileSync(caminho, 'utf8').split('\n');
  for (const linha of linhas) {
    const texto = linha.trim();
    if (!texto) {
      continue;
    }
    if (texto.startsWith('#')) {
      continue;
    }
    if (!texto.includes('=')) {
      continue;
    }

    const indice = texto.indexOf('=');
    const chave = texto.slice(0, indice).trim();
    let valor = texto.slice(indice + 1).trim();
    if (valor.startsWith('"') && valor.endsWith('"')) {
      valor = valor.slice(1, -1);
    }
    if (!process.env[chave]) {
      process.env[chave] = valor;
    }
  }
}

function buscarTexto(valor: string | undefined, padrao: string) {
  if (!valor) {
    return padrao;
  }
  const texto = valor.trim();
  if (!texto) {
    return padrao;
  }
  return texto;
}

export type ConfiguracaoMcp = {
  urlApi: string;
  urlWeb: string;
  slugConta: string;
  email: string;
  senha: string;
};

export function carregarConfiguracao(): ConfiguracaoMcp {
  lerEnvArquivos();

  const urlApi = buscarTexto(process.env.COTA_API_URL, 'http://localhost:3333/api/v1');
  const urlWeb = buscarTexto(process.env.COTA_WEB_URL, 'http://localhost:3001');
  const slugConta = buscarTexto(process.env.COTA_ACCOUNT_SLUG, '');
  const email = buscarTexto(process.env.COTA_EMAIL, '');
  const senha = buscarTexto(process.env.COTA_PASSWORD, '');

  if (!slugConta) {
    throw new Error('Defina COTA_ACCOUNT_SLUG para o MCP entrar na conta.');
  }
  if (!email) {
    throw new Error('Defina COTA_EMAIL para o MCP entrar na conta.');
  }
  if (!senha) {
    throw new Error('Defina COTA_PASSWORD para o MCP entrar na conta.');
  }

  return {
    urlApi: urlApi.replace(/\/$/, ''),
    urlWeb: urlWeb.replace(/\/$/, ''),
    slugConta,
    email,
    senha,
  };
}

export type ConfiguracaoHttp = {
  urlApi: string;
  urlWeb: string;
  // Public address of this server, e.g. https://mcp.cota.app. The connector
  // address people paste into Claude or ChatGPT is this plus /mcp.
  urlPublica: string;
  host: string;
  porta: number;
  redis: { host: string; porta: number; senha?: string } | null;
  confiarProxy: string | boolean;
  producao: boolean;
};

function lerConfiancaProxy(valor: string): string | boolean {
  const texto = valor.trim();
  if (texto === '' || texto === 'false') {
    return false;
  }
  if (texto === 'true') {
    return true;
  }
  return texto;
}

// The hosted server: every person signs in with their own Cota account
// through OAuth, so there are no credentials here.
export function carregarConfiguracaoHttp(): ConfiguracaoHttp {
  lerEnvArquivos();

  const producao = process.env.NODE_ENV === 'production';
  const porta = Number(buscarTexto(process.env.MCP_PORT, '3334'));
  const urlPublica = buscarTexto(process.env.MCP_PUBLIC_URL, `http://localhost:${porta}`).replace(/\/$/, '');
  const urlWeb = buscarTexto(process.env.COTA_WEB_URL, buscarTexto(process.env.FRONTEND_BASE_URL, 'http://localhost:3001'));

  if (producao && !urlPublica.startsWith('https://')) {
    throw new Error('MCP_PUBLIC_URL precisa ser um endereço https:// em produção.');
  }

  // Without Redis the server keeps connections in memory: fine on one
  // machine for development, lost on restart. Production needs Redis.
  let redis: ConfiguracaoHttp['redis'] = null;
  if (process.env.REDIS_HOST || producao) {
    redis = {
      host: buscarTexto(process.env.REDIS_HOST, 'localhost'),
      porta: Number(buscarTexto(process.env.REDIS_PORT, '6379')),
      senha: process.env.REDIS_PASSWORD || undefined,
    };
  }

  return {
    urlApi: buscarTexto(process.env.COTA_API_URL, 'http://localhost:3333/api/v1').replace(/\/$/, ''),
    urlWeb: urlWeb.replace(/\/$/, ''),
    urlPublica,
    host: buscarTexto(process.env.MCP_HOST, '0.0.0.0'),
    porta,
    redis,
    confiarProxy: lerConfiancaProxy(process.env.MCP_TRUST_PROXY ?? ''),
    producao,
  };
}
