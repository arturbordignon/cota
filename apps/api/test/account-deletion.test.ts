import type { FastifyInstance } from 'fastify';
import { buscarTamanhoDoObjeto } from '@cota/storage';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { chamar, criarApp, criarMembro, criarProposta, registrarConta, type Conta } from './helpers.js';

const stripeFalso = vi.hoisted(() => ({ excluidos: [] as string[] }));

vi.mock('../src/lib/stripe.js', () => ({
  isStripeEnabled: () => true,
  getStripe: () => ({
    customers: {
      del: async (id: string) => {
        stripeFalso.excluidos.push(id);
        return { id, deleted: true };
      },
    },
  }),
}));

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(100, 1)]);

describe('account deletion', () => {
  let app: FastifyInstance;
  let dono: Conta;
  let membro: Conta;
  let outra: Conta;
  let chaveFoto: string;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
    outra = await registrarConta(app);
    membro = await criarMembro(app, dono);
    await app.prisma.account.update({ where: { id: dono.accountId }, data: { stripeCustomerId: `cus_${dono.accountId}` } });

    await chamar(app, { method: 'POST', url: '/api/v1/clients', token: dono.accessToken, payload: { name: 'Cliente' } });
    const proposta = await criarProposta(app, dono);
    const destino = await chamar(app, {
      method: 'POST',
      url: '/api/v1/assets/upload-url',
      token: dono.accessToken,
      payload: { proposalId: proposta.id, contentType: 'image/png', size: PNG.length },
    });
    const { key, uploadUrl } = destino.json();
    await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG });
    chaveFoto = key;
    await chamar(app, {
      method: 'PATCH',
      url: `/api/v1/proposals/${proposta.id}`,
      token: dono.accessToken,
      payload: { assets: [{ s3ObjectKey: key, mimeType: 'image/png', position: 0 }] },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  function excluir(token: string, payload: object) {
    return chamar(app, { method: 'DELETE', url: '/api/v1/account', token, payload });
  }

  it('is only for owners', async () => {
    const resposta = await excluir(membro.accessToken, { password: membro.password, confirmSlug: dono.slug });
    expect(resposta.statusCode).toBe(403);
  });

  it('needs the workspace slug typed again', async () => {
    const resposta = await excluir(dono.accessToken, { password: dono.password, confirmSlug: 'outro-workspace' });
    expect(resposta.statusCode).toBe(400);
  });

  it('needs the owner password', async () => {
    const resposta = await excluir(dono.accessToken, { password: 'senha-errada-123', confirmSlug: dono.slug });
    expect(resposta.statusCode).toBe(403);
  });

  it('erases the workspace, its people, files and Stripe customer', async () => {
    expect(await buscarTamanhoDoObjeto(chaveFoto)).toBe(PNG.length);

    const resposta = await excluir(dono.accessToken, { password: dono.password, confirmSlug: dono.slug });
    expect(resposta.statusCode, resposta.body).toBe(204);

    expect(await app.prisma.account.findUnique({ where: { id: dono.accountId } })).toBeNull();
    expect(await app.prisma.user.count({ where: { accountId: dono.accountId } })).toBe(0);
    expect(await app.prisma.proposal.count({ where: { accountId: dono.accountId } })).toBe(0);
    expect(await app.prisma.client.count({ where: { accountId: dono.accountId } })).toBe(0);
    expect(await app.prisma.auditEvent.count({ where: { accountId: dono.accountId } })).toBe(0);
    expect(await buscarTamanhoDoObjeto(chaveFoto)).toBeNull();
    expect(stripeFalso.excluidos).toContain(`cus_${dono.accountId}`);

    expect((await chamar(app, { method: 'GET', url: '/api/v1/auth/me', token: dono.accessToken })).statusCode).toBe(401);
    expect((await chamar(app, { method: 'GET', url: '/api/v1/auth/me', token: membro.accessToken })).statusCode).toBe(401);
    const login = await chamar(app, {
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { accountSlug: dono.slug, email: dono.email, password: dono.password },
    });
    expect(login.statusCode).toBe(401);
  });

  it('leaves other accounts untouched', async () => {
    expect((await chamar(app, { method: 'GET', url: '/api/v1/auth/me', token: outra.accessToken })).statusCode).toBe(200);
  });
});
