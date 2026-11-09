import dayjs from 'dayjs';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, primeiroModelo, registrarConta, type Conta } from './helpers.js';

function criar(app: FastifyInstance, conta: Conta, modeloId: string, idioma = 'pt-BR') {
  return chamar(app, {
    method: 'POST',
    url: '/api/v1/proposals',
    token: conta.accessToken,
    headers: { 'accept-language': idioma },
    payload: { templateId: modeloId, title: 'Teste' },
  });
}

async function encerrarTeste(app: FastifyInstance, conta: Conta, fim: Date) {
  await app.prisma.subscription.updateMany({
    where: { accountId: conta.accountId, status: 'trialing', stripeSubscriptionId: null },
    data: { currentPeriodEnd: fim },
  });
}

describe('free trial', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('starts every new account on a 14-day trial', async () => {
    const conta = await registrarConta(app);
    const account = await app.prisma.account.findUniqueOrThrow({
      where: { id: conta.accountId },
      include: { currentPlan: true },
    });
    expect(account.currentPlan?.slug).toBe('br-trial');
    expect(account.currentPlan?.isTrial).toBe(true);

    const assinatura = await app.prisma.subscription.findFirstOrThrow({ where: { accountId: conta.accountId } });
    expect(assinatura.status).toBe('trialing');
    const dias = dayjs(assinatura.currentPeriodEnd).diff(dayjs(), 'day', true);
    expect(dias).toBeGreaterThan(13.9);
    expect(dias).toBeLessThanOrEqual(14);

    const resumo = await chamar(app, { method: 'GET', url: '/api/v1/billing/overview', token: conta.accessToken });
    const dados = resumo.json().data;
    expect(dados.plan.isTrial).toBe(true);
    expect(dados.trial.ended).toBe(false);
    expect(dados.canCreate).toBe(true);
    expect(dados.usage).toMatchObject({ used: 0, total: 10 });
  });

  it('stops new proposals once the trial is over, with a link to the plans', async () => {
    const conta = await registrarConta(app);
    const modelo = await primeiroModelo(app, conta);
    expect((await criar(app, conta, modelo.id)).statusCode).toBe(201);

    await encerrarTeste(app, conta, dayjs().subtract(1, 'minute').toDate());
    const resposta = await criar(app, conta, modelo.id, 'en');
    expect(resposta.statusCode).toBe(402);
    const corpo = resposta.json();
    expect(corpo.code).toBe('TRIAL_ENDED');
    expect(corpo.message).toMatch(/free trial has ended/i);
    expect(corpo.plansUrl).toMatch(/\/plans$/);

    const resumo = await chamar(app, { method: 'GET', url: '/api/v1/billing/overview', token: conta.accessToken });
    expect(resumo.json().data).toMatchObject({ canCreate: false, trial: { ended: true } });
  });

  it('allows ten proposals during the trial', async () => {
    const conta = await registrarConta(app);
    const modelo = await primeiroModelo(app, conta);
    for (let i = 0; i < 10; i += 1) {
      expect((await criar(app, conta, modelo.id)).statusCode).toBe(201);
    }
    const decima = await criar(app, conta, modelo.id);
    expect(decima.statusCode).toBe(402);
    expect(decima.json().code).toBe('PROPOSAL_LIMIT_REACHED');
  });

  it('counts what was used last month when the trial crosses into a new month', async () => {
    const conta = await registrarConta(app);
    const modelo = await primeiroModelo(app, conta);
    // An earlier period that ended after the trial began, whatever today's date:
    // the trial started 13 days ago and that period closed yesterday.
    await encerrarTeste(app, conta, dayjs().add(1, 'day').toDate());
    await app.prisma.proposalUsage.create({
      data: {
        accountId: conta.accountId,
        periodStart: dayjs().startOf('month').subtract(1, 'month').toDate(),
        periodEnd: dayjs().subtract(1, 'day').toDate(),
        proposalsUsed: 8,
      },
    });

    expect((await criar(app, conta, modelo.id)).statusCode).toBe(201);
    expect((await criar(app, conta, modelo.id)).statusCode).toBe(201);
    expect((await criar(app, conta, modelo.id)).statusCode).toBe(402);
  });

  it('leaves the trial out of the plans on sale and lists annual options', async () => {
    const resposta = await chamar(app, { method: 'GET', url: '/api/v1/billing/plans' });
    const slugs = (resposta.json().data as { slug: string }[]).map((plano) => plano.slug);
    expect(slugs).not.toContain('br-trial');
    expect(slugs).not.toContain('us-trial');
    expect(slugs).toEqual(expect.arrayContaining(['br-50-year', 'br-100-year', 'us-50-year', 'us-100-year']));
  });
});
