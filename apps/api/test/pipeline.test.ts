import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, ipAleatorio, sufixo, registrarConta } from './helpers.js';

describe('pipeline stages', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  function etapas(token: string) {
    return chamar(app, { method: 'GET', url: '/api/v1/pipeline/stages', token });
  }

  it('creates the starting stages only once when the board is opened twice at the same time', async () => {
    const conta = await registrarConta(app);
    const [a, b] = await Promise.all([etapas(conta.accessToken), etapas(conta.accessToken)]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);

    const nomes = ((await etapas(conta.accessToken)).json().data as { name: string }[]).map((etapa) => etapa.name);
    expect(nomes).toEqual(['Descoberta', 'Qualificação', 'Proposta enviada', 'Fechado']);
  });

  it('names the starting stages in the language of the account', async () => {
    const registro = await chamar(app, {
      method: 'POST',
      url: '/api/v1/auth/register',
      ip: ipAleatorio(),
      payload: { accountName: `Cranes ${sufixo()}`, email: `owner-${sufixo()}@test.local`, password: 'password-123', locale: 'en' },
    });
    const nomes = ((await etapas(registro.json().tokens.accessToken)).json().data as { name: string }[]).map(
      (etapa) => etapa.name,
    );
    expect(nomes).toEqual(['Discovery', 'Qualification', 'Proposal sent', 'Closed']);
  });
});
