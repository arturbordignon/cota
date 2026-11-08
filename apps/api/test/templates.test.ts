import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, registrarConta, type Conta } from './helpers.js';

describe('templates', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function criarModelo(nome: string) {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/templates',
      token: dono.accessToken,
      payload: { name: nome, inputSchemaJson: {}, htmlBody: '<h1>{{company.name}}</h1><p>{{client.name}}</p>' },
    });
    expect(resposta.statusCode).toBe(201);
    return resposta.json().data as { id: string };
  }

  async function listar(scope: string) {
    const resposta = await chamar(app, { method: 'GET', url: `/api/v1/templates?scope=${scope}`, token: dono.accessToken });
    return (resposta.json().data as { id: string }[]).map((modelo) => modelo.id);
  }

  it('leaves a deleted template out of the list', async () => {
    const modelo = await criarModelo('Modelo para apagar');
    expect(await listar('custom')).toContain(modelo.id);

    const apagado = await chamar(app, { method: 'DELETE', url: `/api/v1/templates/${modelo.id}`, token: dono.accessToken });
    expect(apagado.statusCode).toBe(204);

    expect(await listar('custom')).not.toContain(modelo.id);
    expect(await listar('all')).not.toContain(modelo.id);
  });
});
