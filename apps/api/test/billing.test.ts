import env from '@cota/config';
import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { chamar, criarApp } from './helpers.js';

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

export { enviarEvento, SEGREDO, stripeFalso };
