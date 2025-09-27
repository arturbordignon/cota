import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type Stripe from 'stripe';
import env from '@crane/config';
import { getStripe, isStripeEnabled } from '../../lib/stripe.js';
import { getBillingOverview } from '../../services/billing.js';

const checkoutBodySchema = z.object({
  planSlug: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});

const billingRoutes: FastifyPluginAsync = async (app) => {
  app.get('/overview', async (request, reply) => {
    await request.jwtVerify();

    const overview = await getBillingOverview(app.prisma, request.user.accountId);

    return reply.send({ data: overview });
  });

  app.get('/plans', async (_request, reply) => {
    const plans = await app.prisma.plan.findMany({
      orderBy: [{ currency: 'asc' }, { amountCents: 'asc' }]
    });

    return reply.send({ data: plans });
  });

  app.post('/checkout', async (request, reply) => {
    const body = checkoutBodySchema.parse(request.body);

    await request.jwtVerify();

    if (!isStripeEnabled()) {
      return reply.status(503).send({ message: 'Stripe não está configurado.' });
    }

    const plan = await app.prisma.plan.findUnique({ where: { slug: body.planSlug } });

    if (!plan || !plan.stripePriceId) {
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
          accountId: account.id
        }
      });

      customerId = customer.id;

      await app.prisma.account.update({
        where: { id: account.id },
        data: { stripeCustomerId: customer.id }
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1
        }
      ],
      subscription_data: {
        metadata: {
          accountId: account.id,
          planSlug: plan.slug
        }
      },
      success_url: body.successUrl,
      cancel_url: body.cancelUrl
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
          status: 'pending'
        }
      });
    } else {
      await app.prisma.subscription.create({
        data: {
          accountId: account.id,
          planId: plan.id,
          stripeCustomerId: customerId,
          status: 'pending'
        }
      });
    }

    return reply.send({ url: session.url });
  });

  app.post('/portal', async (request, reply) => {
    await request.jwtVerify();

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
      return_url: env.FRONTEND_BASE_URL
    });

    return reply.send({ url: portal.url });
  });

  app.post('/webhook', {
    config: { rawBody: true }
  }, async (request, reply) => {
    if (!isStripeEnabled()) {
      return reply.status(503).send({ message: 'Stripe não está configurado.' });
    }

    const stripe = getStripe();
    const signature = request.headers['stripe-signature'];

    if (!signature) {
      return reply.status(400).send({ message: 'Assinatura inválida.' });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.rawBody as string, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      request.log.error({ err }, 'Falha ao validar webhook do Stripe');
      return reply.status(400).send({ message: 'Webhook inválido.' });
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;

        const account = await app.prisma.account.findFirst({ where: { stripeCustomerId: customerId } });
        if (!account) break;

        const priceId = subscription.items.data[0]?.price?.id;
        if (!priceId) break;

        const plan = await app.prisma.plan.findFirst({ where: { stripePriceId: priceId } });
        if (!plan) break;

        await app.prisma.$transaction([
          app.prisma.subscription.upsert({
            where: { stripeSubscriptionId: subscription.id },
            update: {
              planId: plan.id,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false
            },
            create: {
              accountId: account.id,
              planId: plan.id,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                : null,
              cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false
            }
          }),
          app.prisma.account.update({
            where: { id: account.id },
            data: {
              currentPlanId: plan.id
            }
          })
        ]);

        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
        if (!customerId) break;
        const account = await app.prisma.account.findFirst({ where: { stripeCustomerId: customerId } });
        if (!account) break;

        await app.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: subscription.status }
        });

        break;
      }
      default:
        request.log.info({ type: event.type }, 'Evento Stripe ignorado');
    }

    return reply.send({ received: true });
  });
};

export default billingRoutes;
