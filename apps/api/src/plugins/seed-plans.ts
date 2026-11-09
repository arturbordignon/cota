import fp from 'fastify-plugin';
import env from '@cota/config';

// Annual plans cost ten months: two months free. They keep the monthly
// proposal allowance of the plan they mirror.
const planDefinitions = [
  {
    slug: 'br-50',
    name: 'Plano Essencial',
    currency: 'BRL',
    amountCents: 4990,
    proposalsPerMonth: 50,
    isUnlimited: false,
    isAnnual: false,
    stripePriceId: env.STRIPE_PRICE_BR_50
  },
  {
    slug: 'br-50-year',
    name: 'Plano Essencial Anual',
    currency: 'BRL',
    amountCents: 49900,
    proposalsPerMonth: 50,
    isUnlimited: false,
    isAnnual: true,
    stripePriceId: env.STRIPE_PRICE_BR_50_ANNUAL
  },
  {
    slug: 'br-100',
    name: 'Plano Profissional',
    currency: 'BRL',
    amountCents: 8990,
    proposalsPerMonth: 100,
    isUnlimited: false,
    isAnnual: false,
    stripePriceId: env.STRIPE_PRICE_BR_100
  },
  {
    slug: 'br-100-year',
    name: 'Plano Profissional Anual',
    currency: 'BRL',
    amountCents: 89900,
    proposalsPerMonth: 100,
    isUnlimited: false,
    isAnnual: true,
    stripePriceId: env.STRIPE_PRICE_BR_100_ANNUAL
  },
  {
    slug: 'br-unlimited',
    name: 'Plano Ilimitado',
    currency: 'BRL',
    amountCents: 14900,
    proposalsPerMonth: null,
    isUnlimited: true,
    isAnnual: false,
    stripePriceId: env.STRIPE_PRICE_BR_UNLIMITED
  },
  {
    slug: 'br-unlimited-year',
    name: 'Plano Ilimitado Anual',
    currency: 'BRL',
    amountCents: 120000,
    proposalsPerMonth: null,
    isUnlimited: true,
    isAnnual: true,
    stripePriceId: env.STRIPE_PRICE_BR_UNLIMITED_ANNUAL
  },
  {
    slug: 'us-50',
    name: 'Essential',
    currency: 'USD',
    amountCents: 1500,
    proposalsPerMonth: 50,
    isUnlimited: false,
    isAnnual: false,
    stripePriceId: env.STRIPE_PRICE_US_50
  },
  {
    slug: 'us-50-year',
    name: 'Essential Annual',
    currency: 'USD',
    amountCents: 15000,
    proposalsPerMonth: 50,
    isUnlimited: false,
    isAnnual: true,
    stripePriceId: env.STRIPE_PRICE_US_50_ANNUAL
  },
  {
    slug: 'us-100',
    name: 'Professional',
    currency: 'USD',
    amountCents: 3000,
    proposalsPerMonth: 100,
    isUnlimited: false,
    isAnnual: false,
    stripePriceId: env.STRIPE_PRICE_US_100
  },
  {
    slug: 'us-100-year',
    name: 'Professional Annual',
    currency: 'USD',
    amountCents: 30000,
    proposalsPerMonth: 100,
    isUnlimited: false,
    isAnnual: true,
    stripePriceId: env.STRIPE_PRICE_US_100_ANNUAL
  },
  {
    slug: 'us-unlimited',
    name: 'Unlimited',
    currency: 'USD',
    amountCents: 10000,
    proposalsPerMonth: null,
    isUnlimited: true,
    isAnnual: false,
    stripePriceId: env.STRIPE_PRICE_US_UNLIMITED
  },
  {
    slug: 'us-unlimited-year',
    name: 'Unlimited Annual',
    currency: 'USD',
    amountCents: 90000,
    proposalsPerMonth: null,
    isUnlimited: true,
    isAnnual: true,
    stripePriceId: env.STRIPE_PRICE_US_UNLIMITED_ANNUAL
  }
];

export default fp(async (app) => {
  await Promise.all(
    planDefinitions.map((plan) => {
      const dados = {
        name: plan.name,
        currency: plan.currency,
        amountCents: plan.amountCents,
        proposalsPerMonth: plan.proposalsPerMonth,
        isUnlimited: plan.isUnlimited,
        isAnnual: plan.isAnnual,
        stripePriceId: plan.stripePriceId || null
      };
      return app.prisma.plan.upsert({
        where: { slug: plan.slug },
        create: { slug: plan.slug, ...dados },
        update: dados
      });
    })
  );
});
