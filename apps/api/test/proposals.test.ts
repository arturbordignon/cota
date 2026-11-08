import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, primeiroModelo, registrarConta, type Conta } from './helpers.js';

describe('proposals', () => {
  let app: FastifyInstance;
  let dono: Conta;
  let modeloId: string;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
    modeloId = (await primeiroModelo(app, dono)).id;
  });

  afterAll(async () => {
    await app.close();
  });

  function criar(payload: Record<string, unknown>) {
    return chamar(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      token: dono.accessToken,
      payload: { templateId: modeloId, ...payload },
    });
  }

  it('adds mobilization to the daily rate times the days', async () => {
    const criada = await criar({ title: 'Totais', totals: { mobilization: 8500, dailyRate: 6200, days: 4 } });
    expect(criada.statusCode).toBe(201);
    expect(criada.json().data.totalsJson.total).toBe(33300);

    const editada = await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/proposals/${criada.json().data.id}`,
      token: dono.accessToken,
      payload: { totals: { mobilization: 1000, dailyRate: 250.5, days: 2 } },
    });
    expect(editada.json().data.totalsJson.total).toBe(1501);
  });

  it('filters the list by status and client', async () => {
    const cliente = await chamar(app, { method: 'POST', url: '/api/v1/clients', token: dono.accessToken, payload: { name: 'Filtro' } });
    const clientId = cliente.json().data.id;
    const daCliente = await criar({ title: 'Da cliente', clientId });
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${daCliente.json().data.id}/send`, token: dono.accessToken });
    await criar({ title: 'Outra' });

    const porCliente = await chamar(app, { method: 'GET', url: `/api/v1/proposals?clientId=${clientId}`, token: dono.accessToken });
    expect(porCliente.json().data.map((p: { title: string }) => p.title)).toEqual(['Da cliente']);

    const enviadas = await chamar(app, { method: 'GET', url: '/api/v1/proposals?status=SENT', token: dono.accessToken });
    expect(enviadas.json().data.every((p: { status: string }) => p.status === 'SENT')).toBe(true);
  });

  it('keeps the first send date when a proposal is sent twice', async () => {
    const criada = await criar({ title: 'Enviar duas vezes' });
    const id = criada.json().data.id;
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${id}/send`, token: dono.accessToken });
    const primeira = (await chamar(app, { method: 'GET', url: `/api/v1/proposals/${id}`, token: dono.accessToken })).json().data.sentAt;
    const segunda = await chamar(app, { method: 'POST', url: `/api/v1/proposals/${id}/send`, token: dono.accessToken });
    expect(segunda.statusCode).toBe(200);
    const depois = (await chamar(app, { method: 'GET', url: `/api/v1/proposals/${id}`, token: dono.accessToken })).json().data.sentAt;
    expect(depois).toBe(primeira);
  });

  it('counts each new proposal in the monthly usage', async () => {
    const antes = (await chamar(app, { method: 'GET', url: '/api/v1/billing/overview', token: dono.accessToken })).json().data.usage.used;
    await criar({ title: 'Conta no uso' });
    const depois = (await chamar(app, { method: 'GET', url: '/api/v1/billing/overview', token: dono.accessToken })).json().data.usage.used;
    expect(depois).toBe(antes + 1);
  });
});
