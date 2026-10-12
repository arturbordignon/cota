import Stripe from 'stripe';
import env from '@cota/config';

let stripeInstance: Stripe | null = null;

if (env.STRIPE_API_KEY) {
  stripeInstance = new Stripe(env.STRIPE_API_KEY, {
    apiVersion: '2023-10-16'
  });
}

export function isStripeEnabled() {
  return Boolean(stripeInstance);
}

export function getStripe(): Stripe {
  if (!stripeInstance) {
    throw new Error('Stripe is not configured.');
  }

  return stripeInstance;
}
