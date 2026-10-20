import { randomBytes, randomInt } from 'node:crypto';
import type { FastifyInstance, InjectOptions } from 'fastify';

import { buildServer } from '../src/app.js';

export type Conta = {
  accountId: string;
  userId: string;
  slug: string;
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  ip: string;
};

export async function criarApp() {
  const app = await buildServer();
  await app.ready();
  return app;
}

// Each fake client gets its own address so per-IP limits don't leak between tests.
export function ipAleatorio() {
  return `10.${randomInt(1, 255)}.${randomInt(1, 255)}.${randomInt(1, 255)}`;
}

export function sufixo() {
  return randomBytes(4).toString('hex');
}

export function chamar(app: FastifyInstance, opcoes: InjectOptions & { token?: string; ip?: string }) {
  const { token, ip, headers, ...resto } = opcoes;
  return app.inject({
    ...resto,
    remoteAddress: ip ?? ipAleatorio(),
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

export async function registrarConta(app: FastifyInstance, nome = `Conta ${sufixo()}`): Promise<Conta> {
  const ip = ipAleatorio();
  const email = `dono-${sufixo()}@teste.local`;
  const password = `senha-${sufixo()}-forte`;
  const resposta = await chamar(app, {
    method: 'POST',
    url: '/api/v1/auth/register',
    ip,
    payload: { accountName: nome, email, password },
  });
  if (resposta.statusCode !== 201) {
    throw new Error(`register failed: ${resposta.statusCode} ${resposta.body}`);
  }
  const corpo = resposta.json();
  return {
    accountId: corpo.account.id,
    userId: corpo.user.id,
    slug: corpo.account.slug,
    email,
    password,
    accessToken: corpo.tokens.accessToken,
    refreshToken: corpo.tokens.refreshToken,
    ip,
  };
}

export async function primeiroModelo(app: FastifyInstance, conta: Conta) {
  const resposta = await chamar(app, { method: 'GET', url: '/api/v1/templates', token: conta.accessToken });
  return resposta.json().data[0] as { id: string };
}

export async function criarProposta(app: FastifyInstance, conta: Conta, titulo = 'Içamento de teste') {
  const modelo = await primeiroModelo(app, conta);
  const resposta = await chamar(app, {
    method: 'POST',
    url: '/api/v1/proposals',
    token: conta.accessToken,
    payload: { templateId: modelo.id, title: titulo, totals: { mobilization: 100, dailyRate: 50, days: 2 } },
  });
  if (resposta.statusCode !== 201) {
    throw new Error(`proposal failed: ${resposta.statusCode} ${resposta.body}`);
  }
  return resposta.json().data as { id: string; publicSlug: string };
}

export async function criarMembro(app: FastifyInstance, dono: Conta, extra: Record<string, unknown> = {}) {
  const email = `membro-${sufixo()}@teste.local`;
  const password = `senha-${sufixo()}-membro`;
  const convite = await chamar(app, {
    method: 'POST',
    url: '/api/v1/team/members',
    token: dono.accessToken,
    payload: { email, fullName: 'Membro Teste', ...extra },
  });
  if (convite.statusCode !== 201) {
    throw new Error(`invite failed: ${convite.statusCode} ${convite.body}`);
  }
  const { id, inviteUrl } = convite.json().data as { id: string; inviteUrl: string };
  const token = new URL(inviteUrl).searchParams.get('token');
  const aceite = await chamar(app, {
    method: 'POST',
    url: '/api/v1/team/invite/accept',
    payload: { token, password },
  });
  if (aceite.statusCode !== 200) {
    throw new Error(`accept failed: ${aceite.statusCode} ${aceite.body}`);
  }
  const ip = ipAleatorio();
  const login = await chamar(app, {
    method: 'POST',
    url: '/api/v1/auth/login',
    ip,
    payload: { accountSlug: dono.slug, email, password },
  });
  const corpo = login.json();
  return {
    accountId: dono.accountId,
    userId: id,
    slug: dono.slug,
    email,
    password,
    accessToken: corpo.tokens.accessToken as string,
    refreshToken: corpo.tokens.refreshToken as string,
    ip,
  } satisfies Conta;
}
