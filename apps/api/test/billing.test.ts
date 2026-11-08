import env from '@cota/config';
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { chamar, criarApp, registrarConta, sufixo, type Conta } from './helpers.js';

const stripeFalso = vi.hoisted(() => ({ instancia: null as unknown as import('stripe').default }));

vi.mock('../src/lib/stripe.js', async () => {
  const { default: StripeReal } = await import('stripe');
  stripeFalso.instancia = new StripeReal('sk_test_fake', { apiVersion: '2023-10-16' });
  return {
    isStripeEnabled: () => true,
    getStripe: () => stripeFalso.instancia,
  };
});

const SEGREDO = 'whsec_teste_local_123';

function enviarEvento(app: FastifyInstance, evento: object, segredo = SEGREDO) {
  const corpo = JSON.stringify(evento);
  const assinatura = Stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: segredo });
  return chamar(app, {
    method: 'POST',
    url: '/api/v1/billing/webhook',
    headers: { 'stripe-signature': assinatura, 'content-type': 'application/json' },
    payload: corpo,
  });
}

describe('stripe webhook signature', () => {
  let app: FastifyInstance;
  const segredoAnterior = env.STRIPE_WEBHOOK_SECRET;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterEach(() => {
    env.STRIPE_WEBHOOK_SECRET = segredoAnterior;
  });

  afterAll(async () => {
    await app.close();
  });

  it('refuses every event when no signing secret is configured', async () => {
    env.STRIPE_WEBHOOK_SECRET = '';
    const resposta = await enviarEvento(app, { id: 'evt_1', type: 'customer.subscription.updated' }, '');
    expect(resposta.statusCode).toBe(503);
  });

  it('rejects a missing signature', async () => {
    env.STRIPE_WEBHOOK_SECRET = SEGREDO;
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/billing/webhook',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ id: 'evt_2', type: 'customer.subscription.updated' }),
    });
    expect(resposta.statusCode).toBe(400);
  });

  it('rejects an event signed with another secret', async () => {
    env.STRIPE_WEBHOOK_SECRET = SEGREDO;
    const resposta = await enviarEvento(app, { id: 'evt_3', type: 'customer.subscription.updated' }, 'whsec_do_atacante');
    expect(resposta.statusCode).toBe(400);
  });

  it('rejects a body changed after signing', async () => {
    env.STRIPE_WEBHOOK_SECRET = SEGREDO;
    const original = JSON.stringify({ id: 'evt_4', type: 'customer.subscription.updated' });
    const assinatura = Stripe.webhooks.generateTestHeaderString({ payload: original, secret: SEGREDO });
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/billing/webhook',
      headers: { 'stripe-signature': assinatura, 'content-type': 'application/json' },
      payload: original.replace('evt_4', 'evt_5'),
    });
    expect(resposta.statusCode).toBe(400);
  });
});

describe('stripe subscription sync', () => {
  let app: FastifyInstance;
  const segredoAnterior = env.STRIPE_WEBHOOK_SECRET;
  const estados = new Map<string, { status: string; price: string; customer: string }>();
  let consultas = 0;
  // Plans are shared by every account, so the ones made here are removed
  // afterwards or they show up on the plans page of the dev database.
  const planosCriados: string[] = [];
  const contasCriadas: string[] = [];

  beforeAll(async () => {
    env.STRIPE_WEBHOOK_SECRET = SEGREDO;
    app = await criarApp();
    vi.spyOn(stripeFalso.instancia.subscriptions, 'retrieve').mockImplementation((async (id: string) => {
      consultas += 1;
      const estado = estados.get(id);
      if (!estado) throw new Error(`unknown subscription ${id}`);
      return {
        id,
        status: estado.status,
        customer: estado.customer,
        items: { data: [{ price: { id: estado.price } }] },
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        cancel_at_period_end: false,
      };
    }) as never);
  });

  afterAll(async () => {
    env.STRIPE_WEBHOOK_SECRET = segredoAnterior;
    vi.restoreAllMocks();
    await app.prisma.account.deleteMany({ where: { id: { in: contasCriadas } } });
    await app.prisma.subscription.deleteMany({ where: { planId: { in: planosCriados } } });
    await app.prisma.plan.deleteMany({ where: { id: { in: planosCriados } } });
    await app.close();
  });

  async function prepararConta() {
    const conta = await registrarConta(app);
    const customer = `cus_${sufixo()}`;
    await app.prisma.account.update({ where: { id: conta.accountId }, data: { stripeCustomerId: customer } });
    const preco = `price_${sufixo()}`;
    const plano = await app.prisma.plan.create({
      data: {
        slug: `teste-ilimitado-${sufixo()}`,
        name: 'Ilimitado de teste',
        currency: 'BRL',
        amountCents: 14900,
        isUnlimited: true,
        stripePriceId: preco,
      },
    });
    planosCriados.push(plano.id);
    contasCriadas.push(conta.accountId);
    const padrao = await app.prisma.plan.findUniqueOrThrow({ where: { slug: 'br-50' } });
    return { conta, customer, preco, plano, padrao };
  }

  async function planoAtual(conta: Conta) {
    const account = await app.prisma.account.findUniqueOrThrow({ where: { id: conta.accountId } });
    return account.currentPlanId;
  }

  function evento(tipo: string, subscriptionId: string, statusNoCorpo = 'active') {
    return {
      id: `evt_${sufixo()}`,
      type: tipo,
      data: { object: { id: subscriptionId, status: statusNoCorpo } },
    };
  }

  it('grants the plan when Stripe confirms the subscription is active', async () => {
    const { conta, customer, preco, plano } = await prepararConta();
    const sub = `sub_${sufixo()}`;
    estados.set(sub, { status: 'active', price: preco, customer });
    expect((await enviarEvento(app, evento('customer.subscription.created', sub))).statusCode).toBe(200);
    expect(await planoAtual(conta)).toBe(plano.id);
  });

  it('records the plan change in the activity log', async () => {
    const { conta, customer, preco } = await prepararConta();
    const sub = `sub_${sufixo()}`;
    estados.set(sub, { status: 'active', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.created', sub));

    const eventos = await app.prisma.auditEvent.findMany({
      where: { accountId: conta.accountId, action: 'billing.plan.changed' },
    });
    expect(eventos).toHaveLength(1);
    expect(eventos[0].metadataJson).toMatchObject({
      summaryKey: 'planChanged',
      summaryParams: { from: 'Plano Essencial', to: 'Ilimitado de teste' },
    });
  });

  it('does not grant the plan when the body says active but Stripe says unpaid', async () => {
    const { conta, customer, preco, padrao } = await prepararConta();
    const sub = `sub_${sufixo()}`;
    estados.set(sub, { status: 'incomplete', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.updated', sub, 'active'));
    expect(await planoAtual(conta)).toBe(padrao.id);
  });

  it('drops back to the default plan when the subscription is canceled', async () => {
    const { conta, customer, preco, plano, padrao } = await prepararConta();
    const sub = `sub_${sufixo()}`;
    estados.set(sub, { status: 'active', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.created', sub));
    expect(await planoAtual(conta)).toBe(plano.id);

    estados.set(sub, { status: 'canceled', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.deleted', sub, 'canceled'));
    expect(await planoAtual(conta)).toBe(padrao.id);

    // A stale "updated" event arriving late must not bring the paid plan back.
    await enviarEvento(app, evento('customer.subscription.updated', sub, 'active'));
    expect(await planoAtual(conta)).toBe(padrao.id);
  });

  it('drops the plan when payments stop', async () => {
    const { conta, customer, preco, padrao } = await prepararConta();
    const sub = `sub_${sufixo()}`;
    estados.set(sub, { status: 'active', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.created', sub));
    estados.set(sub, { status: 'unpaid', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.updated', sub, 'unpaid'));
    expect(await planoAtual(conta)).toBe(padrao.id);
  });

  it('keeps the plan of another paid subscription when an old one is canceled', async () => {
    const { conta, customer, preco, plano } = await prepararConta();
    const antiga = `sub_${sufixo()}`;
    const nova = `sub_${sufixo()}`;
    estados.set(antiga, { status: 'active', price: preco, customer });
    estados.set(nova, { status: 'active', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.created', antiga));
    await enviarEvento(app, evento('customer.subscription.created', nova));
    estados.set(antiga, { status: 'canceled', price: preco, customer });
    await enviarEvento(app, evento('customer.subscription.deleted', antiga, 'canceled'));
    expect(await planoAtual(conta)).toBe(plano.id);
  });

  it('processes a redelivered event only once', async () => {
    const { customer, preco } = await prepararConta();
    const sub = `sub_${sufixo()}`;
    estados.set(sub, { status: 'active', price: preco, customer });
    const repetido = evento('customer.subscription.updated', sub);
    const antes = consultas;
    await enviarEvento(app, repetido);
    await enviarEvento(app, repetido);
    expect(consultas - antes).toBe(1);
  });
});

describe('stripe checkout', () => {
  let app: FastifyInstance;
  let conta: Conta;

  beforeAll(async () => {
    app = await criarApp();
    conta = await registrarConta(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    'https://phish.example/obrigado',
    'https://app.cota.test.phish.example/',
    'javascript:alert(1)',
  ])('refuses to send the customer back to %s', async (endereco) => {
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/billing/checkout',
      token: conta.accessToken,
      payload: { planSlug: 'br-100', successUrl: endereco, cancelUrl: `${env.FRONTEND_BASE_URL}/plans` },
    });
    expect(resposta.statusCode).toBe(400);
  });
});
