import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, primeiroModelo, registrarConta, type Conta } from './helpers.js';

describe('clients', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function criarCliente(payload: Record<string, unknown>) {
    const resposta = await chamar(app, { method: 'POST', url: '/api/v1/clients', token: dono.accessToken, payload });
    expect(resposta.statusCode).toBe(201);
    return resposta.json().data as { id: string };
  }

  it('clears optional fields sent as null on update', async () => {
    const cliente = await criarCliente({ name: 'Horizonte', email: 'compras@horizonte.test', phone: '11 9999-0000' });

    const resposta = await chamar(app, {
      method: 'PUT',
      url: `/api/v1/clients/${cliente.id}`,
      token: dono.accessToken,
      payload: { email: null, phone: null },
    });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toMatchObject({ name: 'Horizonte', email: null, phone: null });
  });

  it('requires a name', async () => {
    const resposta = await chamar(app, { method: 'POST', url: '/api/v1/clients', token: dono.accessToken, payload: { email: 'sem-nome@test.local' } });
    expect(resposta.statusCode).toBe(400);
  });

  it('keeps the proposals of a deleted client, without the client', async () => {
    const cliente = await criarCliente({ name: 'Cliente que sai' });
    const modelo = await primeiroModelo(app, dono);
    const proposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      token: dono.accessToken,
      payload: { templateId: modelo.id, clientId: cliente.id, title: 'Fica sem cliente' },
    });

    const apagado = await chamar(app, { method: 'DELETE', url: `/api/v1/clients/${cliente.id}`, token: dono.accessToken });
    expect(apagado.statusCode).toBe(204);

    const depois = await chamar(app, { method: 'GET', url: `/api/v1/proposals/${proposta.json().data.id}`, token: dono.accessToken });
    expect(depois.statusCode).toBe(200);
    expect(depois.json().data.clientId).toBeNull();
  });
});
