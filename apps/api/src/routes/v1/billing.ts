import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type Stripe from 'stripe';
import env from '@cota/config';

import { getStripe, isStripeEnabled } from '../../lib/stripe.js';
import { getBillingOverview, getTrialPlanSlug } from '../../services/billing.js';
import { exigirPermissao } from '../../utils/permissions.js';

const STATUS_PAGOS = ['active', 'trialing'];
// Stripe retries for up to three days; remembering ids a bit longer is enough.
const VALIDADE_EVENTO_SEGUNDOS = 4 * 24 * 60 * 60;

// Plan changes made through Stripe show up under "Billing" in the activity log.
async function registrarTrocaDePlano(
  app: FastifyInstance,
  conta: { id: string; currentPlan: { name: string } | null },
  planoNovoId: string,
) {
  const novo = await app.prisma.plan.findUnique({ where: { id: planoNovoId }, select: { name: true } });
  const de = conta.currentPlan?.name ?? '—';
  const para = novo?.name ?? '—';
  await app.prisma.auditEvent
    .create({
      data: {
        accountId: conta.id,
        userId: null,
        action: 'billing.plan.changed',
        entityType: 'Account',
        entityId: conta.id,
        summary: `Plano alterado de ${de} para ${para}`,
        metadataJson: { summaryKey: 'planChanged', summaryParams: { from: de, to: para } },
      },
    })
    .catch((err) => app.log.error({ err }, 'Failed to record the plan change'));
}

// Webhook bodies can arrive late or out of order, so the subscription is read
// back from Stripe and the account gets a paid plan only while it is paid.
async function sincronizarAssinatura(app: FastifyInstance, subscriptionId: string) {
  const assinatura = await getStripe().subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof assinatura.customer === 'string' ? assinatura.customer : assinatura.customer?.id;
  if (!customerId) return;

  const account = await app.prisma.account.findFirst({
    where: { stripeCustomerId: customerId },
    include: { currentPlan: true },
  });
  if (!account) return;

  const priceId = assinatura.items.data[0]?.price?.id;
  let plan = null;
  if (priceId) {
    plan = await app.prisma.plan.findFirst({ where: { stripePriceId: priceId } });
  }

  const dados = {
    status: assinatura.status,
    currentPeriodEnd: assinatura.current_period_end
      ? new Date(assinatura.current_period_end * 1000)
      : null,
    cancelAtPeriodEnd: assinatura.cancel_at_period_end ?? false,
  };

  if (plan) {
    await app.prisma.subscription.upsert({
      where: { stripeSubscriptionId: assinatura.id },
      update: { ...dados, planId: plan.id },
      create: {
        ...dados,
        accountId: account.id,
        planId: plan.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: assinatura.id,
      },
    });
  } else {
    await app.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: assinatura.id },
      data: dados,
    });
  }

  if (plan && STATUS_PAGOS.includes(assinatura.status)) {
    if (plan.id !== account.currentPlanId) {
      await app.prisma.account.update({
        where: { id: account.id },
        data: { currentPlanId: plan.id },
      });
      await registrarTrocaDePlano(app, account, plan.id);
    }
    return;
  }

  // This subscription no longer pays: fall back to another paid Stripe
  // subscription of the account, or to the free trial. A trial that already
  // ended lets nothing new be created, so a cancelled account can't keep making
  // proposals for free; what it already sent stays online.
  const outraPaga = await app.prisma.subscription.findFirst({
    where: {
      accountId: account.id,
      status: { in: STATUS_PAGOS },
      AND: [{ stripeSubscriptionId: { not: null } }, { stripeSubscriptionId: { not: assinatura.id } }],
    },
    orderBy: { updatedAt: 'desc' },
  });

  let planoSeguinte = outraPaga?.planId;
  if (!planoSeguinte) {
    let localePadrao = 'pt-BR';
    if ((plan ?? account.currentPlan)?.currency === 'USD') {
      localePadrao = 'en';
    }
    const teste = await app.prisma.plan.findUnique({ where: { slug: getTrialPlanSlug(localePadrao) } });
    planoSeguinte = teste?.id;
  }

  if (planoSeguinte && planoSeguinte !== account.currentPlanId) {
    await app.prisma.account.update({
      where: { id: account.id },
      data: { currentPlanId: planoSeguinte },
    });
    await registrarTrocaDePlano(app, account, planoSeguinte);
  }
}

// Stripe sends the customer back to these addresses, so they must be pages of
// this app and never a lookalike site passed in by a crafted request.
function enderecoDoApp(endereco: string) {
  try {
    return new URL(endereco).origin === new URL(env.FRONTEND_BASE_URL).origin;
  } catch {
    return false;
  }
}

const enderecoDeRetorno = z.string().url().refine(enderecoDoApp, 'must be a page of the app');

const checkoutBodySchema = z.object({
  planSlug: z.string().min(1),
  successUrl: enderecoDeRetorno,
  cancelUrl: enderecoDeRetorno,
});

const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/overview', { preHandler: app.authenticate }, async (request, reply) => {
    const overview = await getBillingOverview(app.prisma, request.user.accountId);

    return reply.send({ data: overview });
  });

  // The trial is never sold, so it is not listed.
  app.get('/plans', async (_request, reply) => {
    const plans = await app.prisma.plan.findMany({
      where: { isTrial: false },
      orderBy: [{ currency: 'asc' }, { isAnnual: 'asc' }, { amountCents: 'asc' }],
    });

    return reply.send({ data: plans });
  });

  app.post('/checkout', { preHandler: [app.authenticate, exigirPermissao('plan')] }, async (request, reply) => {
    const body = checkoutBodySchema.parse(request.body);

    if (!isStripeEnabled()) {
      return reply.status(503).send({ message: 'Stripe não está configurado.' });
    }

    const plan = await app.prisma.plan.findUnique({ where: { slug: body.planSlug } });

    if (!plan || !plan.stripePriceId || plan.isTrial) {
      return reply.status(404).send({ message: 'Plano não encontrado.' });
    }

    const stripe = getStripe();

    const account = await app.prisma.account.findUnique({ where: { id: request.user.accountId } });

    if (!account) {
      return reply.status(404).send({ message: 'Conta não encontrada.' });
    }

    let customerId = account.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: account.name,
        metadata: {
          accountId: account.id,
        },
      });

      customerId = customer.id;

      await app.prisma.account.update({
        where: { id: account.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          accountId: account.id,
          planSlug: plan.slug,
        },
      },
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
    });

    if (typeof session.subscription === 'string') {
      await app.prisma.subscription.upsert({
        where: { stripeSubscriptionId: session.subscription },
        update: { planId: plan.id, status: 'pending' },
        create: {
          accountId: account.id,
          planId: plan.id,
          stripeCustomerId: customerId,
          stripeSubscriptionId: session.subscription,
          status: 'pending',
        },
      });
    } else {
      await app.prisma.subscription.create({
        data: {
          accountId: account.id,
          planId: plan.id,
          stripeCustomerId: customerId,
          status: 'pending',
        },
      });
    }

    return reply.send({ url: session.url });
  });

  app.post('/portal', { preHandler: [app.authenticate, exigirPermissao('plan')] }, async (request, reply) => {
    if (!isStripeEnabled()) {
      return reply.status(503).send({ message: 'Stripe não está configurado.' });
    }

    const stripe = getStripe();
    const account = await app.prisma.account.findUnique({ where: { id: request.user.accountId } });

    if (!account || !account.stripeCustomerId) {
      return reply.status(404).send({ message: 'Cliente Stripe não encontrado.' });
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: account.stripeCustomerId,
      return_url: env.FRONTEND_BASE_URL,
    });

    return reply.send({ url: portal.url });
  });

  app.post(
    '/webhook',
    {
      config: { rawBody: true },
    },
    async (request, reply) => {
      // Without a signing secret nothing can be verified, so refuse every event
      // instead of trusting the body.
      if (!isStripeEnabled() || !env.STRIPE_WEBHOOK_SECRET) {
        return reply.status(503).send({ message: 'Stripe não está configurado.' });
      }

      const stripe = getStripe();
      const signature = request.headers['stripe-signature'];

      if (!signature) {
        return reply.status(400).send({ message: 'Assinatura inválida.' });
      }

      let event;

      try {
        event = stripe.webhooks.constructEvent(
          request.rawBody as string,
          signature,
          env.STRIPE_WEBHOOK_SECRET,
        );
      } catch (err) {
        request.log.error({ err }, 'Falha ao validar webhook do Stripe');
        return reply.status(400).send({ message: 'Webhook inválido.' });
      }

      const chaveEvento = `cota:stripe-evento:${event.id}`;
      if (await app.redis.get(chaveEvento)) {
        return reply.send({ received: true });
      }

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await sincronizarAssinatura(app, subscription.id);
          break;
        }
        default:
          request.log.info({ type: event.type }, 'Evento Stripe ignorado');
      }

      await app.redis.set(chaveEvento, '1', 'EX', VALIDADE_EVENTO_SEGUNDOS);

      return reply.send({ received: true });
    },
  );
};

export default billingRoutes;
