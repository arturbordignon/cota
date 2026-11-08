import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { diasPedidos, escolherIntencao } from '../src/services/report-questions.js';
import { chamar, criarApp, criarProposta, registrarConta, type Conta } from './helpers.js';

describe('report questions', () => {
  it.each([
    ['Taxa de conversão mensal', 'conversionByMonth'],
    ['Monthly conversion rate by consultant', 'conversionByMember'],
    ['Receita por cliente nos últimos 90 dias', 'revenueByClient'],
    ['Revenue by client in the last 90 days', 'revenueByClient'],
    ['Tempo médio até o aceite', 'daysToAnswer'],
    ['Average time to an answer', 'daysToAnswer'],
    ['Propostas por consultor', 'proposalsByMember'],
    ['Proposals per team member', 'proposalsByMember'],
    ['Propostas por status', 'proposalsByStatus'],
  ])('understands "%s"', (pergunta, intencao) => {
    expect(escolherIntencao(pergunta)).toBe(intencao);
  });

  it("doesn't guess a question it can't answer", () => {
    expect(escolherIntencao('Quantos guindastes temos?')).toBeNull();
  });

  it('reads the number of days asked for', () => {
    expect(diasPedidos('Receita por cliente nos últimos 90 dias')).toBe(90);
    expect(diasPedidos('Revenue in the last 7 days')).toBe(7);
    expect(diasPedidos('Receita por cliente')).toBeNull();
  });
});

describe('report runs', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
    const cliente = await chamar(app, {
      method: 'POST',
      url: '/api/v1/clients',
      token: dono.accessToken,
      payload: { name: 'Construtora Horizonte' },
    });
    const proposta = await criarProposta(app, dono, 'Içamento aceito');
    await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/proposals/${proposta.id}`,
      token: dono.accessToken,
      payload: { title: 'Içamento aceito' },
    });
    await app.prisma.proposal.update({ where: { id: proposta.id }, data: { clientId: cliente.json().data.id } });
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${proposta.id}/send`, token: dono.accessToken });
    await chamar(app, { method: 'POST', url: `/api/v1/public/proposals/${proposta.publicSlug}/accept` });
    await criarProposta(app, dono, 'Rascunho');
  });

  afterAll(async () => {
    await app.close();
  });

  function perguntar(question: string) {
    return chamar(app, { method: 'POST', url: '/api/v1/reports/run', token: dono.accessToken, payload: { question } });
  }

  it('answers revenue by client with name and value rows', async () => {
    const resposta = await perguntar('Receita por cliente nos últimos 90 dias');
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toMatchObject({
      intent: 'revenueByClient',
      result: [{ name: 'Construtora Horizonte', value: 200 }],
    });
  });

  it('answers the conversion rate per month', async () => {
    const resposta = await perguntar('Taxa de conversão');
    expect(resposta.json().data.result).toEqual([{ name: expect.stringMatching(/^\d{4}-\d{2}$/), value: 50 }]);
  });

  it('counts proposals by status', async () => {
    const linhas = (await perguntar('Propostas por status')).json().data.result as { name: string; value: number }[];
    expect(Object.fromEntries(linhas.map((linha) => [linha.name, linha.value]))).toEqual({ ACCEPTED: 1, DRAFT: 1 });
  });

  it('measures the days until the client answered', async () => {
    const resposta = await perguntar('Tempo médio até o aceite');
    expect(resposta.json().data.result).toHaveLength(1);
  });

  it('says when a question is not supported', async () => {
    const resposta = await perguntar('Quantos guindastes temos?');
    expect(resposta.statusCode).toBe(400);
    expect(resposta.json().code).toBe('REPORT_QUESTION_UNSUPPORTED');
  });
});
