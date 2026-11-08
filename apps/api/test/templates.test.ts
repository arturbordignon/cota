import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, primeiroModelo, registrarConta, type Conta } from './helpers.js';

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

  it('previews a template filled with the company and a sample client', async () => {
    const modelo = await criarModelo('Modelo de prévia');

    const resposta = await chamar(app, {
      method: 'GET',
      url: `/api/v1/templates/${modelo.id}/preview`,
      token: dono.accessToken,
    });

    expect(resposta.statusCode).toBe(200);
    const html = resposta.json().data.html as string;
    expect(html).not.toContain('{{');
    expect(html).toContain('Cliente exemplo');
  });

  it('previews the system template without leftover variables', async () => {
    const modelo = await primeiroModelo(app, dono);
    const resposta = await chamar(app, {
      method: 'GET',
      url: `/api/v1/templates/${modelo.id}/preview`,
      token: dono.accessToken,
    });
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data.html).not.toContain('{{');
  });

  it("doesn't preview another account's template", async () => {
    const outra = await registrarConta(app);
    const modelo = await criarModelo('Modelo privado');
    const resposta = await chamar(app, {
      method: 'GET',
      url: `/api/v1/templates/${modelo.id}/preview`,
      token: outra.accessToken,
    });
    expect(resposta.statusCode).toBe(404);
  });

  it('offers the crane template in English with no Portuguese left', async () => {
    const lista = await chamar(app, { method: 'GET', url: '/api/v1/templates?scope=system&locale=en', token: dono.accessToken });
    const modelos = lista.json().data as { id: string; locale: string }[];
    expect(modelos).toHaveLength(1);

    const previa = await chamar(app, {
      method: 'GET',
      url: `/api/v1/templates/${modelos[0].id}/preview`,
      token: dono.accessToken,
    });
    const html = previa.json().data.html as string;
    expect(html).toContain('Proposed investment');
    expect(html).not.toMatch(/Proposta|Investimento|Equipe|Condições|Destinatário|operação/);
  });

  it('leaves the equipment table out of a proposal without equipment', async () => {
    const modelo = (await chamar(app, { method: 'GET', url: '/api/v1/templates?scope=system&locale=pt-BR', token: dono.accessToken })).json().data[0];
    const proposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      token: dono.accessToken,
      payload: { templateId: modelo.id, title: 'Sem equipamentos', payload: { equipment: [] } },
    });
    const { id, publicSlug } = proposta.json().data;
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${id}/send`, token: dono.accessToken });
    const pagina = await chamar(app, { method: 'GET', url: `/api/v1/public/proposals/${publicSlug}` });
    expect(pagina.json().data.html).not.toContain('Equipamentos principais');
  });
});
