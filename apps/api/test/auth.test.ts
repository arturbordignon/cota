import { createHmac } from 'node:crypto';
import env from '@cota/config';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, registrarConta, type Conta } from './helpers.js';

function base64url(valor: object | string) {
  const texto = typeof valor === 'string' ? valor : JSON.stringify(valor);
  return Buffer.from(texto).toString('base64url');
}

function assinarManual(cabecalho: object, corpo: object, segredo: string) {
  const conteudo = `${base64url(cabecalho)}.${base64url(corpo)}`;
  const assinatura = createHmac('sha256', segredo).update(conteudo).digest('base64url');
  return `${conteudo}.${assinatura}`;
}

describe('sessions', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  function me(token: string) {
    return chamar(app, { method: 'GET', url: '/api/v1/auth/me', token });
  }

  it('accepts a fresh access token', async () => {
    expect((await me(dono.accessToken)).statusCode).toBe(200);
  });

  it('rejects a token signed with another secret', async () => {
    const agora = Math.floor(Date.now() / 1000);
    const falso = assinarManual(
      { alg: 'HS256', typ: 'JWT' },
      { sub: dono.userId, accountId: dono.accountId, role: 'OWNER', iat: agora, exp: agora + 600 },
      'not-the-real-secret',
    );
    expect((await me(falso)).statusCode).toBe(401);
  });

  it('rejects an unsigned alg:none token', async () => {
    const agora = Math.floor(Date.now() / 1000);
    const semAssinatura = `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url({
      sub: dono.userId,
      accountId: dono.accountId,
      role: 'OWNER',
      iat: agora,
      exp: agora + 600,
    })}.`;
    expect((await me(semAssinatura)).statusCode).toBe(401);
  });

  it('rejects a token with a tampered payload', async () => {
    const [cabecalho, , assinatura] = dono.accessToken.split('.');
    const corpo = base64url({ sub: dono.userId, accountId: 'outra-conta', role: 'OWNER' });
    expect((await me(`${cabecalho}.${corpo}.${assinatura}`)).statusCode).toBe(401);
  });

  it('rejects an expired token', async () => {
    const vencido = assinarManual(
      { alg: 'HS256', typ: 'JWT' },
      { sub: dono.userId, accountId: dono.accountId, role: 'OWNER', iat: 1000, exp: 2000 },
      env.JWT_ACCESS_SECRET,
    );
    expect((await me(vencido)).statusCode).toBe(401);
  });

  it('does not accept a refresh token as an access token', async () => {
    expect((await me(dono.refreshToken)).statusCode).toBe(401);
  });

  it('does not accept an access token on the refresh endpoint', async () => {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: dono.accessToken },
    });
    expect(resposta.statusCode).toBe(401);
  });

  it('cuts off a deactivated member on the next request', async () => {
    const membro = await criarMembro(app, dono);
    expect((await me(membro.accessToken)).statusCode).toBe(200);

    const desativar = await chamar(app, {
      method: 'PUT',
      url: `/api/v1/team/members/${membro.userId}`,
      token: dono.accessToken,
      payload: { isActive: false },
    });
    expect(desativar.statusCode).toBe(200);

    expect((await me(membro.accessToken)).statusCode).toBe(401);
    const clientes = await chamar(app, { method: 'GET', url: '/api/v1/clients', token: membro.accessToken });
    expect(clientes.statusCode).toBe(401);
    const renovar = await chamar(app, {
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken: membro.refreshToken },
    });
    expect(renovar.statusCode).toBe(401);
  });

  it('a demoted owner loses owner-only routes on the next request', async () => {
    const outro = await criarMembro(app, dono);
    const promover = await chamar(app, {
      method: 'PUT',
      url: `/api/v1/team/members/${outro.userId}`,
      token: dono.accessToken,
      payload: { role: 'OWNER' },
    });
    expect(promover.statusCode).toBe(200);

    const login = await chamar(app, {
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { accountSlug: dono.slug, email: outro.email, password: outro.password },
    });
    const tokenDeDono = login.json().tokens.accessToken as string;
    expect((await chamar(app, { method: 'GET', url: '/api/v1/team', token: tokenDeDono })).statusCode).toBe(200);

    await chamar(app, {
      method: 'PUT',
      url: `/api/v1/team/members/${outro.userId}`,
      token: dono.accessToken,
      payload: { role: 'MEMBER' },
    });

    expect((await chamar(app, { method: 'GET', url: '/api/v1/team', token: tokenDeDono })).statusCode).toBe(403);
    expect((await chamar(app, { method: 'GET', url: '/api/v1/audit-events', token: tokenDeDono })).statusCode).toBe(403);
  });
});
