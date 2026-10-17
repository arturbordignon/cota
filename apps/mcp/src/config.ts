import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function lerEnvArquivo() {
  const caminho = resolve(process.cwd(), '.env');
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
  lerEnvArquivo();

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
