import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, criarProposta, registrarConta, type Conta } from './helpers.js';

describe('team ranking', () => {
  let app: FastifyInstance;
  let dono: Conta;
  let vendedor: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
    vendedor = await criarMembro(app, dono);
    // The salesperson needs to create proposals: give them a department that can.
    const departamento = await chamar(app, {
      method: 'POST',
      url: '/api/v1/team/departments',
      token: dono.accessToken,
      payload: { name: 'Vendas', permissionPreset: 'all' },
    });
    await chamar(app, {
      method: 'PUT',
      url: `/api/v1/team/members/${vendedor.userId}`,
      token: dono.accessToken,
      payload: { departmentId: departamento.json().data.id },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('ranks people by the value of the proposals clients accepted', async () => {
    const doVendedor = await criarProposta(app, vendedor, 'Venda do vendedor');
    await chamar(app, { method: 'POST', url: `/api/v1/proposals/${doVendedor.id}/send`, token: vendedor.accessToken });
    await chamar(app, { method: 'POST', url: `/api/v1/public/proposals/${doVendedor.publicSlug}/accept` });
    await criarProposta(app, dono, 'Rascunho do dono');

    const resposta = await chamar(app, { method: 'GET', url: '/api/v1/team/ranking', token: dono.accessToken });
    expect(resposta.statusCode).toBe(200);
    const entradas = resposta.json().data.entries as { name: string; acceptedProposals: number; totalValue: number }[];
    expect(entradas[0]).toMatchObject({ name: 'Membro Teste', acceptedProposals: 1, totalValue: 200 });
    expect(entradas.find((entrada) => entrada.name !== 'Membro Teste')?.acceptedProposals ?? 0).toBe(0);
  });

  it('is only for the owner', async () => {
    const resposta = await chamar(app, { method: 'GET', url: '/api/v1/team/ranking', token: vendedor.accessToken });
    expect(resposta.statusCode).toBe(403);
  });
});
