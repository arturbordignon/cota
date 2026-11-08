import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, registrarConta, sufixo, type Conta } from './helpers.js';

describe('invites', () => {
  let app: FastifyInstance;
  let dono: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app, 'Guindastes Convite');
  });

  afterAll(async () => {
    await app.close();
  });

  async function convidar() {
    const email = `convite-${sufixo()}@teste.local`;
    const resposta = await chamar(app, {
      method: 'POST',
      url: '/api/v1/team/members',
      token: dono.accessToken,
      payload: { email, fullName: 'Pessoa Convidada' },
    });
    const { id, inviteUrl } = resposta.json().data as { id: string; inviteUrl: string };
    return { id, email, token: new URL(inviteUrl).searchParams.get('token') as string };
  }

  function previa(token: string) {
    return chamar(app, { method: 'GET', url: `/api/v1/team/invite/preview?token=${token}` });
  }

  it('shows who is invited and to which workspace', async () => {
    const convite = await convidar();
    const resposta = await previa(convite.token);
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data).toMatchObject({ email: convite.email, account: { name: 'Guindastes Convite' } });
  });

  it('refuses an expired invite', async () => {
    const convite = await convidar();
    await app.prisma.user.update({ where: { id: convite.id }, data: { inviteTokenExpiresAt: new Date(Date.now() - 1000) } });
    expect((await previa(convite.token)).statusCode).toBe(410);
    const aceite = await chamar(app, {
      method: 'POST',
      url: '/api/v1/team/invite/accept',
      payload: { token: convite.token, password: 'senha-forte-123' },
    });
    expect(aceite.statusCode).toBe(410);
  });

  it('a new link replaces the old one', async () => {
    const convite = await convidar();
    const novo = await chamar(app, {
      method: 'POST',
      url: `/api/v1/team/members/${convite.id}/invite-link`,
      token: dono.accessToken,
      payload: {},
    });
    const novoToken = new URL(novo.json().data.inviteUrl).searchParams.get('token') as string;
    expect((await previa(convite.token)).statusCode).toBe(404);
    expect((await previa(novoToken)).statusCode).toBe(200);
  });
});
