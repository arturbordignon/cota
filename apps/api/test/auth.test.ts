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

  describe('refresh tokens', () => {
    function renovar(refreshToken: string) {
      return chamar(app, { method: 'POST', url: '/api/v1/auth/refresh', payload: { refreshToken } });
    }

    function lerJti(token: string) {
      return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).jti as string;
    }

    it('rotates on use and the old token only survives a short grace window', async () => {
      const conta = await registrarConta(app);
      const primeira = await renovar(conta.refreshToken);
      expect(primeira.statusCode).toBe(200);
      const novo = primeira.json().tokens.refreshToken as string;
      expect(novo).not.toBe(conta.refreshToken);

      const restante = await app.redis.ttl(`cota:refresh:${lerJti(conta.refreshToken)}`);
      expect(restante).toBeGreaterThan(0);
      expect(restante).toBeLessThanOrEqual(30);

      // Simulate the grace window running out.
      await app.redis.del(`cota:refresh:${lerJti(conta.refreshToken)}`);
      expect((await renovar(conta.refreshToken)).statusCode).toBe(401);
      expect((await renovar(novo)).statusCode).toBe(200);
    });

    it('lets two tabs refresh with the same token at once', async () => {
      const conta = await registrarConta(app);
      const [a, b] = await Promise.all([renovar(conta.refreshToken), renovar(conta.refreshToken)]);
      expect(a.statusCode).toBe(200);
      expect(b.statusCode).toBe(200);
    });

    it('logout revokes the refresh token', async () => {
      const conta = await registrarConta(app);
      const sair = await chamar(app, {
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken: conta.refreshToken },
      });
      expect(sair.statusCode).toBe(204);
      expect((await renovar(conta.refreshToken)).statusCode).toBe(401);
    });

    it('logout with a garbage token is harmless', async () => {
      const sair = await chamar(app, { method: 'POST', url: '/api/v1/auth/logout', payload: { refreshToken: 'lixo' } });
      expect(sair.statusCode).toBe(204);
    });

    it('rejects a validly signed refresh token that was never issued', async () => {
      const forjado = app.jwt.sign(
        { sub: dono.userId, accountId: dono.accountId, role: 'OWNER', tipo: 'refresh', jti: 'inventado' },
        { key: env.JWT_REFRESH_SECRET, expiresIn: '7d' },
      );
      expect((await renovar(forjado)).statusCode).toBe(401);
    });
  });

  describe('login', () => {
    function entrar(accountSlug: string, email: string, password: string) {
      return chamar(app, { method: 'POST', url: '/api/v1/auth/login', payload: { accountSlug, email, password } });
    }

    it('answers the same way for unknown accounts, unknown emails, wrong passwords and pending invites', async () => {
      const conta = await registrarConta(app);
      const convite = await chamar(app, {
        method: 'POST',
        url: '/api/v1/team/members',
        token: conta.accessToken,
        payload: { email: 'pendente@teste.local' },
      });
      expect(convite.statusCode).toBe(201);

      const respostas = await Promise.all([
        entrar('conta-que-nao-existe', conta.email, conta.password),
        entrar(conta.slug, 'ninguem@teste.local', conta.password),
        entrar(conta.slug, conta.email, 'senha-errada-123'),
        entrar(conta.slug, 'pendente@teste.local', 'qualquer-senha-123'),
      ]);
      for (const resposta of respostas) {
        expect(resposta.statusCode).toBe(401);
        expect(resposta.json()).toEqual({ message: 'Invalid credentials' });
      }
    });

    it('spends about as long on an unknown email as on a wrong password', async () => {
      const conta = await registrarConta(app);
      async function medir(email: string) {
        const inicio = performance.now();
        await entrar(conta.slug, email, 'senha-errada-123');
        return performance.now() - inicio;
      }
      const desconhecido: number[] = [];
      const senhaErrada: number[] = [];
      for (let i = 0; i < 3; i += 1) {
        desconhecido.push(await medir(`ninguem-${i}@teste.local`));
        senhaErrada.push(await medir(conta.email));
      }
      const media = (valores: number[]) => valores.reduce((total, valor) => total + valor, 0) / valores.length;
      expect(media(desconhecido) / media(senhaErrada)).toBeGreaterThan(0.5);
    });

    it('locks one account email after repeated failures from many addresses', async () => {
      const conta = await registrarConta(app);
      for (let i = 0; i < 10; i += 1) {
        expect((await entrar(conta.slug, conta.email, `errada-${i}-123`)).statusCode).toBe(401);
      }
      const comSenhaCerta = await entrar(conta.slug, conta.email, conta.password);
      expect(comSenhaCerta.statusCode).toBe(429);

      const outraConta = await registrarConta(app);
      expect((await entrar(outraConta.slug, outraConta.email, outraConta.password)).statusCode).toBe(200);

      await app.redis.del(`cota:login-falhas:${conta.slug}:${conta.email}`);
      expect((await entrar(conta.slug, conta.email, conta.password)).statusCode).toBe(200);
    });

    it('a successful login clears the failure count', async () => {
      const conta = await registrarConta(app);
      for (let i = 0; i < 9; i += 1) {
        await entrar(conta.slug, conta.email, `errada-${i}-123`);
      }
      expect((await entrar(conta.slug, conta.email, conta.password)).statusCode).toBe(200);
      expect((await entrar(conta.slug, conta.email, 'errada-de-novo-1')).statusCode).toBe(401);
      expect((await entrar(conta.slug, conta.email, conta.password)).statusCode).toBe(200);
    });
  });
});
