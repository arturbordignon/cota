import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, primeiroModelo, registrarConta } from './helpers.js';

describe('monthly proposal limit', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await criarApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('holds when many proposals are created at the same time', async () => {
    const conta = await registrarConta(app);
    const modelo = await primeiroModelo(app, conta);
    const plano = await app.prisma.plan.findUniqueOrThrow({ where: { slug: 'br-50' } });
    await app.prisma.account.update({ where: { id: conta.accountId }, data: { currentPlanId: plano.id } });

    const inicio = new Date();
    inicio.setDate(1);
    // Fill the month up to one slot below the limit by creating 49 proposals' worth of usage.
    const primeira = await chamar(app, {
      method: 'POST',
      url: '/api/v1/proposals',
      token: conta.accessToken,
      payload: { templateId: modelo.id, title: 'primeira' },
    });
    expect(primeira.statusCode).toBe(201);
    await app.prisma.proposalUsage.updateMany({
      where: { accountId: conta.accountId },
      data: { proposalsUsed: (plano.proposalsPerMonth ?? 50) - 1 },
    });

    const respostas = await Promise.all(
      Array.from({ length: 8 }, (_, indice) =>
        chamar(app, {
          method: 'POST',
          url: '/api/v1/proposals',
          token: conta.accessToken,
          payload: { templateId: modelo.id, title: `concorrente ${indice}` },
        }),
      ),
    );
    const codigos = respostas.map((resposta) => resposta.statusCode).sort();
    expect(codigos.filter((codigo) => codigo === 201)).toHaveLength(1);
    expect(codigos.filter((codigo) => codigo === 402)).toHaveLength(7);

    const uso = await app.prisma.proposalUsage.findMany({ where: { accountId: conta.accountId } });
    expect(uso).toHaveLength(1);
    expect(uso[0].proposalsUsed).toBe(plano.proposalsPerMonth);
  });

  it('counts every proposal when many are created at once below the limit', async () => {
    const conta = await registrarConta(app);
    const modelo = await primeiroModelo(app, conta);
    const respostas = await Promise.all(
      Array.from({ length: 6 }, (_, indice) =>
        chamar(app, {
          method: 'POST',
          url: '/api/v1/proposals',
          token: conta.accessToken,
          payload: { templateId: modelo.id, title: `paralela ${indice}` },
        }),
      ),
    );
    expect(respostas.every((resposta) => resposta.statusCode === 201)).toBe(true);
    const uso = await app.prisma.proposalUsage.findMany({ where: { accountId: conta.accountId } });
    expect(uso).toHaveLength(1);
    expect(uso[0].proposalsUsed).toBe(6);
  });
});
