import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, registrarConta, type Conta } from './helpers.js';

describe('departments', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a department when the form sends an empty description as null', async () => {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/team/departments',
      token: dono.accessToken,
      payload: { name: 'Operações', description: null, permissionPreset: 'view' },
    });

    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().data.description).toBeNull();
  });
});
