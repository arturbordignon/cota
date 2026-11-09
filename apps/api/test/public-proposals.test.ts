import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarProposta, registrarConta, semLimiteDePropostas, type Conta } from './helpers.js';

describe('public proposal page', () => {
  let app: FastifyInstance;
  let conta: Conta;

  beforeAll(async () => {
    app = await criarApp();
    conta = await registrarConta(app);
    await semLimiteDePropostas(app, conta);
  });

  afterAll(async () => {
    await app.close();
  });

  async function propostaEnviada() {
    const proposta = await criarProposta(app, conta);
    const envio = await chamar(app, {
      method: 'POST',
      url: `/api/v1/proposals/${proposta.id}/send`,
      token: conta.accessToken,
    });
    expect(envio.statusCode).toBe(200);
    return proposta;
  }

  function ver(slug: string) {
    return chamar(app, { method: 'GET', url: `/api/v1/public/proposals/${slug}` });
  }

  function responder(slug: string, resposta: 'accept' | 'decline') {
    return chamar(app, { method: 'POST', url: `/api/v1/public/proposals/${slug}/${resposta}` });
  }

  it("shows the total in the account's currency even when the proposal is in English", async () => {
    const proposta = await propostaEnviada();
    await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/proposals/${proposta.id}`,
      token: conta.accessToken,
      payload: { locale: 'en' },
    });

    const pagina = await ver(proposta.publicSlug);
    expect(pagina.json().data.total).toBe('R$200.00');
  });

  it('keeps drafts private', async () => {
    const rascunho = await criarProposta(app, conta);
    expect((await ver(rascunho.publicSlug)).statusCode).toBe(404);
    expect((await responder(rascunho.publicSlug, 'accept')).statusCode).toBe(404);
  });

  it('cannot be found by internal id', async () => {
    const proposta = await propostaEnviada();
    expect((await ver(proposta.id)).statusCode).toBe(404);
  });

  it('shows a sent proposal without internal fields', async () => {
    const proposta = await propostaEnviada();
    const resposta = await ver(proposta.publicSlug);
    expect(resposta.statusCode).toBe(200);
    const dados = resposta.json().data;
    for (const campo of ['id', 'accountId', 'createdById', 'payloadJson', 'templateId', 'clientId']) {
      expect(dados).not.toHaveProperty(campo);
    }
    expect(resposta.body).not.toContain(conta.accountId);
  });

  it('can be answered only once', async () => {
    const proposta = await propostaEnviada();
    expect((await responder(proposta.publicSlug, 'accept')).statusCode).toBe(200);
    expect((await responder(proposta.publicSlug, 'accept')).statusCode).toBe(409);
    expect((await responder(proposta.publicSlug, 'decline')).statusCode).toBe(409);
    expect((await ver(proposta.publicSlug)).json().data.status).toBe('ACCEPTED');
  });

  it('records only one answer when accept and decline race', async () => {
    for (let rodada = 0; rodada < 5; rodada += 1) {
      const proposta = await propostaEnviada();
      const respostas = await Promise.all([
        responder(proposta.publicSlug, 'accept'),
        responder(proposta.publicSlug, 'decline'),
        responder(proposta.publicSlug, 'accept'),
        responder(proposta.publicSlug, 'decline'),
      ]);
      const aceitas = respostas.filter((resposta) => resposta.statusCode === 200);
      expect(aceitas).toHaveLength(1);
      const gravada = await app.prisma.proposal.findUniqueOrThrow({ where: { id: proposta.id } });
      expect(Boolean(gravada.acceptedAt) && Boolean(gravada.declinedAt)).toBe(false);
      expect(gravada.status).toBe(aceitas[0].json().data.status);
    }
  });

  it('expires and refuses answers after the deadline', async () => {
    const proposta = await propostaEnviada();
    await app.prisma.proposal.update({ where: { id: proposta.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await responder(proposta.publicSlug, 'accept')).statusCode).toBe(409);
    expect((await ver(proposta.publicSlug)).json().data.status).toBe('EXPIRED');
  });
});
