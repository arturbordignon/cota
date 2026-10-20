import env from '@cota/config';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp } from './helpers.js';

async function criarAppEmProducao() {
  const anterior = { ...env };
  env.NODE_ENV = 'production';
  env.FRONTEND_BASE_URL = 'https://app.cota.test/';
  env.CDN_BASE_URL = 'https://cdn.cota.test';
  try {
    return await criarApp();
  } finally {
    Object.assign(env, anterior);
  }
}

function preflight(app: FastifyInstance, origem: string) {
  return chamar(app, {
    method: 'OPTIONS',
    url: '/api/v1/clients',
    headers: {
      origin: origem,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization',
    },
  });
}

describe('production surface', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarAppEmProducao();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets the configured frontends call the API with credentials', async () => {
    for (const origem of ['https://app.cota.test', 'https://cdn.cota.test']) {
      const resposta = await preflight(app, origem);
      expect(resposta.headers['access-control-allow-origin']).toBe(origem);
      expect(resposta.headers['access-control-allow-credentials']).toBe('true');
    }
  });

  it('gives no CORS grant to other origins, including localhost', async () => {
    for (const origem of ['https://evil.example', 'http://localhost:3001', 'https://app.cota.test.evil.example', 'null']) {
      const resposta = await preflight(app, origem);
      expect(resposta.headers['access-control-allow-origin'], origem).toBeUndefined();
    }
  });

  it('does not publish the API docs', async () => {
    for (const url of ['/docs', '/docs/json', '/docs/static/index.html']) {
      const resposta = await chamar(app, { method: 'GET', url });
      expect(resposta.statusCode, url).toBe(404);
    }
  });
});

describe('development surface', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('still accepts the local frontend in development', async () => {
    const resposta = await preflight(app, 'http://localhost:3001');
    expect(resposta.headers['access-control-allow-origin']).toBe('http://localhost:3001');
  });

  it('keeps the API docs for local work', async () => {
    const resposta = await chamar(app, { method: 'GET', url: '/docs/json' });
    expect(resposta.statusCode).toBe(200);
  });
});
