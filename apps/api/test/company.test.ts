import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, criarProposta, registrarConta, type Conta } from './helpers.js';

describe('company details', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app, 'Conta Original');
  });

  afterAll(async () => {
    await app.close();
  });

  it('prints the saved company on the proposal the client sees', async () => {
    const salvo = await chamar(app, {
      method: 'PUT',
      url: '/api/v1/account/company',
      token: dono.accessToken,
      payload: { name: 'Guindastes Horizonte Ltda', tagline: 'Içamentos com segurança', email: 'comercial@horizonte.test' },
    });
    expect(salvo.statusCode).toBe(200);

    const proposta = await criarProposta(app, dono, 'Com empresa');
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${proposta.id}/send`, token: dono.accessToken });
    const pagina = (await chamar(app, { method: 'GET', url: `/api/v1/public/proposals/${proposta.publicSlug}` })).json().data;

    expect(pagina.companyName).toBe('Guindastes Horizonte Ltda');
    expect(pagina.html).toContain('Guindastes Horizonte Ltda');
    expect(pagina.html).toContain('Içamentos com segurança');
  });

  it('returns the saved details on the account', async () => {
    const conta = await chamar(app, { method: 'GET', url: '/api/v1/account', token: dono.accessToken });
    expect(conta.json().data.company).toMatchObject({ name: 'Guindastes Horizonte Ltda' });
  });

  it('only the owner changes them', async () => {
    const membro = await criarMembro(app, dono);
    const resposta = await chamar(app, {
      method: 'PUT',
      url: '/api/v1/account/company',
      token: membro.accessToken,
      payload: { name: 'Outra empresa' },
    });
    expect(resposta.statusCode).toBe(403);
  });
});
