import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarMembro, registrarConta, type Conta } from './helpers.js';

describe('notifications', () => {
  let app: FastifyInstance;
  let dono: Conta;
  let membro: Conta;

  beforeAll(async () => {
    app = await criarApp();
    dono = await registrarConta(app);
    membro = await criarMembro(app, dono);
  });

  afterAll(async () => {
    await app.close();
  });

  async function notificar(destinatario: Conta, titulo: string) {
    return app.prisma.notification.create({
      data: {
        accountId: destinatario.accountId,
        recipientId: destinatario.userId,
        title: titulo,
        body: 'Corpo',
        metadataJson: { key: 'proposalAccepted', params: { proposal: titulo }, link: '/proposals/x' },
      },
    });
  }

  async function listar(conta: Conta) {
    const resposta = await chamar(app, { method: 'GET', url: '/api/v1/notifications', token: conta.accessToken });
    expect(resposta.statusCode).toBe(200);
    return resposta.json() as { data: { id: string; key: string; isRead: boolean }[]; unreadCount: number };
  }

  it('lists only the notifications addressed to the user', async () => {
    const minha = await notificar(dono, 'Para o dono');
    await notificar(membro, 'Para o membro');

    const lista = await listar(dono);
    expect(lista.data.map((item) => item.id)).toContain(minha.id);
    expect(lista.data.some((item) => item.key === 'proposalAccepted')).toBe(true);
    expect((await listar(membro)).data.map((item) => item.id)).not.toContain(minha.id);
  });

  it('marks one notification as read', async () => {
    const notificacao = await notificar(dono, 'Ler uma');
    const antes = (await listar(dono)).unreadCount;

    const resposta = await chamar(app, {
      method: 'POST',
      url: `/api/v1/notifications/${notificacao.id}/read`,
      token: dono.accessToken,
    });

    expect(resposta.statusCode).toBe(204);
    expect((await listar(dono)).unreadCount).toBe(antes - 1);
  });

  it("can't mark someone else's notification", async () => {
    const doMembro = await notificar(membro, 'Do membro');
    const resposta = await chamar(app, {
      method: 'POST',
      url: `/api/v1/notifications/${doMembro.id}/read`,
      token: dono.accessToken,
    });
    expect(resposta.statusCode).toBe(404);
  });

  it('marks all as read', async () => {
    await notificar(dono, 'Mais uma');
    const resposta = await chamar(app, { method: 'POST', url: '/api/v1/notifications/read-all', token: dono.accessToken });
    expect(resposta.statusCode).toBe(204);
    expect((await listar(dono)).unreadCount).toBe(0);
  });
});
