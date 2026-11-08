import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, criarProposta, registrarConta, type Conta } from './helpers.js';

type Evento = { event: string; category: string; summaryKey: string | null; summaryParams?: Record<string, string> };

describe('activity log', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  async function eventos(query = '') {
    const resposta = await chamar(app, { method: 'GET', url: `/api/v1/audit-events${query}`, token: dono.accessToken });
    expect(resposta.statusCode).toBe(200);
    return resposta.json().data as Evento[];
  }

  it('records a proposal from creation to the client answer', async () => {
    const proposta = await criarProposta(app, dono, 'Içamento auditado');
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${proposta.id}/send`, token: dono.accessToken });
    await chamar(app, { method: 'POST', url: `/api/v1/public/proposals/${proposta.publicSlug}/accept` });

    const lista = await eventos('?category=proposal');
    expect(lista.map((evento) => evento.event)).toEqual(['proposal.accepted', 'proposal.sent', 'proposal.created']);
    expect(lista.every((evento) => evento.category === 'proposal')).toBe(true);
    expect(lista[0]).toMatchObject({ summaryKey: 'proposalAccepted', summaryParams: { proposal: 'Içamento auditado' } });
  });

  it('gives every event a translatable summary', async () => {
    await criarMembro(app, dono);
    const lista = await eventos();
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.filter((evento) => !evento.summaryKey)).toEqual([]);
  });

  it('is only for the owner', async () => {
    const membro = await criarMembro(app, dono);
    const resposta = await chamar(app, { method: 'GET', url: '/api/v1/audit-events', token: membro.accessToken });
    expect(resposta.statusCode).toBe(403);
  });
});
