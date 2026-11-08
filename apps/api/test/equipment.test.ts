import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, registrarConta, type Conta } from './helpers.js';

describe('services (equipment)', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('clears the capacity, rate and texts of a service', async () => {
    const criado = await chamar(app, {
      method: 'POST',
      url: '/api/v1/equipment',
      token: dono.accessToken,
      payload: { name: 'Guindaste 90t', capacityTons: 90, dailyRate: 6200, description: 'Lança de 60 m', notes: 'Operador incluso' },
    });
    expect(criado.statusCode).toBe(201);

    const resposta = await chamar(app, {
      method: 'PUT',
      url: `/api/v1/equipment/${criado.json().data.id}`,
      token: dono.accessToken,
      payload: { capacityTons: null, dailyRate: null, description: '', notes: '' },
    });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toMatchObject({ name: 'Guindaste 90t', capacityTons: null, dailyRate: null, specsJson: null });
  });
});
