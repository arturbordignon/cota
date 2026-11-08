// Small HTTP client and assertion helpers shared by the smoke checks.
// They run against a live API: start it (pnpm local:up or pnpm dev:api) first.

export const API_URL = (process.env.SMOKE_API_URL ?? 'http://localhost:3333/api/v1').replace(/\/$/, '');

const resultados = [];

export async function chamar(method, path, { body, token, headers = {} } = {}) {
  const cabecalhos = { Accept: 'application/json', ...headers };
  if (body !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (token) cabecalhos.Authorization = `Bearer ${token}`;
  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const resposta = await fetch(url, {
    method,
    headers: cabecalhos,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const texto = await resposta.text();
  let json = null;
  try {
    json = texto ? JSON.parse(texto) : null;
  } catch {
    json = texto;
  }
  return { status: resposta.status, json };
}

// Calls the endpoint and records whether the status is the expected one.
export async function verificar(nome, method, path, esperado, opcoes = {}) {
  const resposta = await chamar(method, path, opcoes);
  const aceitos = Array.isArray(esperado) ? esperado : [esperado];
  const ok = aceitos.includes(resposta.status);
  resultados.push({ ok, nome });
  const detalhe = ok ? '' : `  ← expected ${aceitos.join('/')}: ${JSON.stringify(resposta.json).slice(0, 200)}`;
  console.log(`${ok ? '✔' : '✘'} ${String(resposta.status).padEnd(3)} ${method.padEnd(6)} ${path}  ${nome}${detalhe}`);
  return resposta;
}

export function secao(titulo) {
  console.log(`\n— ${titulo}`);
}

export function sufixo() {
  return Math.random().toString(36).slice(2, 8);
}

export function resumo() {
  const falhas = resultados.filter((item) => !item.ok);
  console.log(`\n${resultados.length - falhas.length}/${resultados.length} checks passed`);
  for (const falha of falhas) console.log(`  failed: ${falha.nome}`);
  return falhas.length === 0;
}
