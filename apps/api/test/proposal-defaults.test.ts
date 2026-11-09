import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, registrarConta, type Conta } from './helpers.js';

describe('proposal defaults', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts empty', async () => {
    const resposta = await chamar(app, { method: 'GET', url: '/api/v1/account/proposal-defaults', token: dono.accessToken });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toEqual({ terms: [], team: [], validityDays: null });
  });

  it('saves the usual terms, crew and validity without touching the company details', async () => {
    await chamar(app, {
      method: 'PUT',
      url: '/api/v1/account/company',
      token: dono.accessToken,
      payload: { name: 'Guindastes Horizonte Ltda', cnpj: '12.345.678/0001-90' },
    });
    const salvo = await chamar(app, {
      method: 'PUT',
      url: '/api/v1/account/proposal-defaults',
      token: dono.accessToken,
      payload: {
        terms: ['Pagamento: 50% na confirmação e 50% na conclusão.', '  Inclui operador e combustível.  '],
        team: ['Operador certificado'],
        validityDays: 10,
      },
    });
    expect(salvo.statusCode).toBe(200);

    const lido = await chamar(app, { method: 'GET', url: '/api/v1/account/proposal-defaults', token: dono.accessToken });
    expect(lido.json().data).toEqual({
      terms: ['Pagamento: 50% na confirmação e 50% na conclusão.', 'Inclui operador e combustível.'],
      team: ['Operador certificado'],
      validityDays: 10,
    });

    const conta = await chamar(app, { method: 'GET', url: '/api/v1/account', token: dono.accessToken });
    expect(conta.json().data.company).toMatchObject({ name: 'Guindastes Horizonte Ltda', cnpj: '12.345.678/0001-90' });
  });

  it('refuses empty lines and absurd validity', async () => {
    const resposta = await chamar(app, {
      method: 'PUT',
      url: '/api/v1/account/proposal-defaults',
      token: dono.accessToken,
      payload: { terms: ['   '], validityDays: 0 },
    });
    expect(resposta.statusCode).toBe(400);
  });

  it('needs permission to edit templates', async () => {
    const membro = await criarMembro(app, dono);
    const leitura = await chamar(app, { method: 'GET', url: '/api/v1/account/proposal-defaults', token: membro.accessToken });
    expect(leitura.statusCode).toBe(200);
    const escrita = await chamar(app, {
      method: 'PUT',
      url: '/api/v1/account/proposal-defaults',
      token: membro.accessToken,
      payload: { terms: ['Outra condição'] },
    });
    expect(escrita.statusCode).toBe(403);
  });
});
