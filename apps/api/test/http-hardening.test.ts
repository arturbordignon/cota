import env from '@cota/config';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp } from './helpers.js';

async function criarAppEmProducao() {
  const anterior = env.NODE_ENV;
  env.NODE_ENV = 'production';
  try {
    return await criarApp();
  } finally {
    env.NODE_ENV = anterior;
  }
}

describe('production surface', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarAppEmProducao();
  });

  afterAll(async () => {
    await app.close();
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

  it('keeps the API docs for local work', async () => {
    const resposta = await chamar(app, { method: 'GET', url: '/docs/json' });
    expect(resposta.statusCode).toBe(200);
  });
});
