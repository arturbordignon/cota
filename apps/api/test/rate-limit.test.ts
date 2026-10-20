import env from '@cota/config';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, ipAleatorio, sufixo } from './helpers.js';

async function criarAppComProxy(valor: string) {
  const anterior = env.TRUST_PROXY;
  env.TRUST_PROXY = valor;
  try {
    return await criarApp();
  } finally {
    env.TRUST_PROXY = anterior;
  }
}

function tentarLogin(app: FastifyInstance, slug: string, opcoes: { ip?: string; xff?: string; email?: string } = {}) {
  return chamar(app, {
    method: 'POST',
    url: '/api/v1/auth/login',
    ip: opcoes.ip,
    headers: opcoes.xff ? { 'x-forwarded-for': opcoes.xff } : undefined,
    payload: { accountSlug: slug, email: opcoes.email ?? 'ninguem@teste.local', password: 'senha-errada-123' },
  });
}

describe('rate limits without a trusted proxy', () => {
  let app: FastifyInstance;
  let outra: FastifyInstance;

  beforeAll(async () => {
    app = await criarApp();
    outra = await criarApp();
  });

  afterAll(async () => {
    await app.close();
    await outra.close();
  });

  it('blocks a login burst from one address', async () => {
    const ip = ipAleatorio();
    const slug = `alvo-${sufixo()}`;
    const codigos = [];
    for (let i = 0; i < 12; i += 1) {
      codigos.push((await tentarLogin(app, slug, { ip })).statusCode);
    }
    expect(codigos.slice(0, 10).every((codigo) => codigo === 401)).toBe(true);
    expect(codigos.slice(10)).toEqual([429, 429]);
  });

  it('does not let a client dodge the limit by forging X-Forwarded-For', async () => {
    const ip = ipAleatorio();
    const slug = `alvo-${sufixo()}`;
    let ultimo = 0;
    for (let i = 0; i < 11; i += 1) {
      ultimo = (await tentarLogin(app, slug, { ip, xff: ipAleatorio() })).statusCode;
    }
    expect(ultimo).toBe(429);
  });

  it('shares the counters between API replicas through Redis', async () => {
    const ip = ipAleatorio();
    const slug = `alvo-${sufixo()}`;
    for (let i = 0; i < 5; i += 1) {
      await tentarLogin(app, slug, { ip });
      await tentarLogin(outra, slug, { ip });
    }
    expect((await tentarLogin(app, slug, { ip })).statusCode).toBe(429);
    expect((await tentarLogin(outra, slug, { ip })).statusCode).toBe(429);
  });
});

describe('rate limits behind a trusted load balancer', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // The helpers give every fake client a 10.x address, like an ALB on private subnets.
    app = await criarAppComProxy('uniquelocal');
  });

  afterAll(async () => {
    await app.close();
  });

  it('counts each real client separately instead of the load balancer', async () => {
    const balanceador = ipAleatorio();
    const slug = `alvo-${sufixo()}`;
    const primeiro = ipAleatorio();
    for (let i = 0; i < 10; i += 1) {
      await tentarLogin(app, slug, { ip: balanceador, xff: primeiro });
    }
    expect((await tentarLogin(app, slug, { ip: balanceador, xff: primeiro })).statusCode).toBe(429);
    // Another email, so the per-account lockout doesn't kick in.
    const outroCliente = await tentarLogin(app, slug, { ip: balanceador, xff: ipAleatorio(), email: 'outra@teste.local' });
    expect(outroCliente.statusCode).toBe(401);
  });
});

describe('limits on sensitive endpoints', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function rajada(quantidade: number, pedido: (ip: string) => Promise<{ statusCode: number }>) {
    const ip = ipAleatorio();
    const codigos: number[] = [];
    for (let i = 0; i < quantidade; i += 1) {
      codigos.push((await pedido(ip)).statusCode);
    }
    return codigos;
  }

  it('limits account sign-ups per address', async () => {
    const codigos = await rajada(11, (ip) =>
      chamar(app, {
        method: 'POST',
        url: '/api/v1/auth/register',
        ip,
        payload: { accountName: `Spam ${sufixo()}`, email: `spam-${sufixo()}@teste.local`, password: 'senha-forte-123' },
      }),
    );
    expect(codigos.slice(0, 10).every((codigo) => codigo === 201)).toBe(true);
    expect(codigos[10]).toBe(429);
  });

  it('limits invite token guessing', async () => {
    const codigos = await rajada(11, (ip) =>
      chamar(app, {
        method: 'POST',
        url: '/api/v1/team/invite/accept',
        ip,
        payload: { token: 'f'.repeat(64), password: 'senha-forte-123' },
      }),
    );
    expect(codigos.slice(0, 10).every((codigo) => codigo === 404)).toBe(true);
    expect(codigos[10]).toBe(429);
  });

  it('limits answers to public proposals', async () => {
    const codigos = await rajada(11, (ip) =>
      chamar(app, { method: 'POST', url: '/api/v1/public/proposals/nao-existe/accept', ip }),
    );
    expect(codigos[10]).toBe(429);
  });

  it('limits token refreshes', async () => {
    const codigos = await rajada(31, (ip) =>
      chamar(app, { method: 'POST', url: '/api/v1/auth/refresh', ip, payload: { refreshToken: 'x' } }),
    );
    expect(codigos[30]).toBe(429);
  });
});

describe('forwarded addresses from untrusted peers', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarAppComProxy('uniquelocal');
  });

  afterAll(async () => {
    await app.close();
  });

  it('ignores X-Forwarded-For sent from a public address', async () => {
    const atacante = `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
    const slug = `alvo-${sufixo()}`;
    let ultimo = 0;
    for (let i = 0; i < 11; i += 1) {
      ultimo = (await tentarLogin(app, slug, { ip: atacante, xff: ipAleatorio(), email: `x${i}@teste.local` })).statusCode;
    }
    expect(ultimo).toBe(429);
  });
});
