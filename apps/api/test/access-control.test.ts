import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, criarProposta, registrarConta, type Conta } from './helpers.js';

// Account B must never read, change or delete anything that belongs to account A.
describe('tenant isolation', () => {
  let app: FastifyInstance;
  let a: Conta;
  let b: Conta;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    app = await criarApp();
    a = await registrarConta(app);
    b = await registrarConta(app);

    const cliente = await chamar(app, {
      method: 'POST',
      url: '/api/v1/clients',
      token: a.accessToken,
      payload: { name: 'Cliente secreto', email: 'cliente@a.local' },
    });
    ids.client = cliente.json().data.id;

    const servico = await chamar(app, {
      method: 'POST',
      url: '/api/v1/equipment',
      token: a.accessToken,
      payload: { name: 'Guindaste 50t', dailyRate: 1000 },
    });
    ids.equipment = servico.json().data.id;

    const modelo = await chamar(app, {
      method: 'POST',
      url: '/api/v1/templates',
      token: a.accessToken,
      payload: { name: 'Modelo A', inputSchemaJson: {}, htmlBody: '<p>{{title}} secreto</p>' },
    });
    ids.template = modelo.json().data.id;

    const proposta = await criarProposta(app, a);
    ids.proposal = proposta.id;
    ids.proposalSlug = proposta.publicSlug;

    const departamento = await chamar(app, {
      method: 'POST',
      url: '/api/v1/team/departments',
      token: a.accessToken,
      payload: { name: 'Comercial' },
    });
    ids.department = departamento.json().data.id;

    const membro = await chamar(app, {
      method: 'POST',
      url: '/api/v1/team/members',
      token: a.accessToken,
      payload: { email: 'vendedor@a.local', fullName: 'Vendedor A' },
    });
    ids.member = membro.json().data.id;

    const estagios = await chamar(app, { method: 'GET', url: '/api/v1/pipeline/stages', token: a.accessToken });
    ids.stage = estagios.json().data[0].id;
    const lead = await chamar(app, {
      method: 'POST',
      url: '/api/v1/pipeline/leads',
      token: a.accessToken,
      payload: { stageId: ids.stage, companyName: 'Lead A' },
    });
    ids.lead = lead.json().data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['GET', () => `/api/v1/clients/${ids.client}`],
    ['PUT', () => `/api/v1/clients/${ids.client}`],
    ['DELETE', () => `/api/v1/clients/${ids.client}`],
    ['PUT', () => `/api/v1/equipment/${ids.equipment}`],
    ['DELETE', () => `/api/v1/equipment/${ids.equipment}`],
    ['GET', () => `/api/v1/templates/${ids.template}`],
    ['PUT', () => `/api/v1/templates/${ids.template}`],
    ['DELETE', () => `/api/v1/templates/${ids.template}`],
    ['GET', () => `/api/v1/proposals/${ids.proposal}`],
    ['GET', () => `/api/v1/proposals/${ids.proposalSlug}`],
    ['PATCH', () => `/api/v1/proposals/${ids.proposal}`],
    ['POST', () => `/api/v1/proposals/${ids.proposal}/generate`],
    ['POST', () => `/api/v1/proposals/${ids.proposal}/send`],
    ['GET', () => `/api/v1/proposals/${ids.proposal}/pdf`],
    ['PUT', () => `/api/v1/team/departments/${ids.department}`],
    ['DELETE', () => `/api/v1/team/departments/${ids.department}`],
    ['PUT', () => `/api/v1/team/members/${ids.member}`],
    ['DELETE', () => `/api/v1/team/members/${ids.member}`],
    ['POST', () => `/api/v1/team/members/${ids.member}/invite-link`],
  ] as const)('%s %s from another account is 404', async (method, url) => {
    const resposta = await chamar(app, {
      method,
      url: url(),
      token: b.accessToken,
      payload: method === 'GET' || method === 'DELETE' ? undefined : { name: 'hack', title: 'hack' },
    });
    expect(resposta.statusCode).toBe(404);
  });

  it('pipeline leads and stages of another account cannot be touched', async () => {
    const meus = await chamar(app, { method: 'GET', url: '/api/v1/pipeline/stages', token: b.accessToken });
    const meuEstagio = meus.json().data[0].id;
    expect(meus.body).not.toContain(ids.lead);

    const paraMeuEstagio = await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/pipeline/leads/${ids.lead}/move`,
      token: b.accessToken,
      payload: { stageId: meuEstagio },
    });
    expect(paraMeuEstagio.statusCode).toBe(404);

    const leadParaEstagioAlheio = await chamar(app, {
      method: 'POST',
      url: '/api/v1/pipeline/leads',
      token: b.accessToken,
      payload: { stageId: ids.stage, companyName: 'Intruso' },
    });
    expect(leadParaEstagioAlheio.statusCode).toBe(404);

    const renomear = await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/pipeline/stages/${ids.stage}`,
      token: b.accessToken,
      payload: { name: 'hackeado' },
    });
    expect(renomear.statusCode).toBe(404);

    const reordenar = await chamar(app, {
      method: 'PATCH',
      url: '/api/v1/pipeline/stages/reorder',
      token: b.accessToken,
      payload: { stages: [{ id: ids.stage }] },
    });
    expect(reordenar.statusCode).toBe(400);

    const apagar = await chamar(app, { method: 'DELETE', url: `/api/v1/pipeline/stages/${ids.stage}`, token: b.accessToken });
    expect(apagar.statusCode).toBe(404);
  });

  it('lists only return the caller account records', async () => {
    for (const url of ['/api/v1/clients', '/api/v1/equipment', '/api/v1/proposals']) {
      const resposta = await chamar(app, { method: 'GET', url, token: b.accessToken });
      expect(resposta.statusCode).toBe(200);
      const texto = resposta.body;
      expect(texto).not.toContain(ids.client);
      expect(texto).not.toContain(ids.equipment);
      expect(texto).not.toContain(ids.proposal);
    }
    const modelos = await chamar(app, { method: 'GET', url: '/api/v1/templates', token: b.accessToken });
    expect(modelos.body).not.toContain(ids.template);
  });

  it('a proposal cannot point at a client or template of another account', async () => {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      token: b.accessToken,
      payload: { templateId: ids.template, title: 'x' },
    });
    expect(resposta.statusCode).toBe(404);

    const comCliente = await chamar(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      token: b.accessToken,
      payload: { templateId: ids.template, clientId: ids.client },
    });
    expect(comCliente.statusCode).toBe(404);
  });

  it('a proposal cannot attach photos stored under another proposal', async () => {
    const minha = await criarProposta(app, b);
    const resposta = await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/proposals/${minha.id}`,
      token: b.accessToken,
      payload: {
        assets: [
          {
            s3ObjectKey: `accounts/${a.accountId}/proposals/${ids.proposal}/photos/abcdefabcdef`,
            mimeType: 'image/png',
            position: 0,
          },
        ],
      },
    });
    expect(resposta.statusCode).toBe(400);
  });

  it('upload URLs cannot be issued for another account proposal', async () => {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/assets/upload-url',
      token: b.accessToken,
      payload: { proposalId: ids.proposal, contentType: 'image/png' },
    });
    expect(resposta.statusCode).toBe(404);
  });

  it('extra fields cannot move a record into another account', async () => {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/clients',
      token: b.accessToken,
      payload: { name: 'Infiltrado', accountId: a.accountId },
    });
    expect(resposta.statusCode).toBe(201);
    expect(resposta.json().data.accountId).toBe(b.accountId);
  });

  it('owner-only areas reject members', async () => {
    const membro = await criarMembro(app, b);
    const membroToken = membro.accessToken;
    for (const [method, url] of [
      ['GET', '/api/v1/team'],
      ['GET', '/api/v1/audit-events'],
      ['POST', '/api/v1/team/departments'],
      ['PUT', '/api/v1/account/company'],
    ] as const) {
      const resposta = await chamar(app, { method, url, token: membroToken, payload: method === 'GET' ? undefined : { name: 'x y' } });
      expect(resposta.statusCode).toBe(403);
    }
  });

  it('every private route requires a token', async () => {
    for (const [method, url] of [
      ['GET', '/api/v1/auth/me'],
      ['GET', '/api/v1/clients'],
      ['GET', '/api/v1/proposals'],
      ['GET', '/api/v1/templates'],
      ['GET', '/api/v1/equipment'],
      ['GET', '/api/v1/pipeline/stages'],
      ['GET', '/api/v1/reports/overview'],
      ['GET', '/api/v1/team'],
      ['GET', '/api/v1/audit-events'],
      ['GET', '/api/v1/account'],
      ['GET', '/api/v1/billing/overview'],
      ['POST', '/api/v1/billing/checkout'],
      ['POST', '/api/v1/billing/portal'],
      ['POST', '/api/v1/assets/upload-url'],
    ] as const) {
      const resposta = await chamar(app, { method, url, payload: method === 'POST' ? {} : undefined });
      expect(resposta.statusCode, `${method} ${url}`).toBe(401);
    }
  });
});
