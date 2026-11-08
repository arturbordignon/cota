import { verificar, secao } from './lib.mjs';

// Company details, billing overview and plans.
export async function verificarConta({ token }) {
  secao('Account and billing');
  await verificar('reads the account', 'GET', '/account', 200, { token });
  await verificar('saves the company details', 'PUT', '/account/company', 200, {
    token,
    body: {
      name: 'Smoke Guindastes Ltda',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 4002-8922',
      email: 'smoke@example.com',
      address: 'Av. Paulista, 1000 - São Paulo/SP',
      tagline: 'Içamentos com segurança',
    },
  });
  await verificar('lists the plans', 'GET', '/billing/plans', 200);
  await verificar('shows the plan usage', 'GET', '/billing/overview', 200, { token });
  // Without Stripe keys these answer 503; with them, checkout returns a URL.
  await verificar('starts a checkout', 'POST', '/billing/checkout', [200, 503], {
    token,
    body: { planSlug: 'br-100', successUrl: 'http://localhost:3001/plans', cancelUrl: 'http://localhost:3001/plans' },
  });
  await verificar('refuses a checkout back to another site', 'POST', '/billing/checkout', 400, {
    token,
    body: { planSlug: 'br-100', successUrl: 'https://evil.example', cancelUrl: 'https://evil.example' },
  });
  await verificar('opens the billing portal', 'POST', '/billing/portal', [200, 404, 503], { token, body: {} });
  await verificar('refuses an unsigned webhook', 'POST', '/billing/webhook', [400, 503], { body: {} });
}
