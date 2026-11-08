import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { chamar, criarApp, criarProposta, registrarConta, type Conta } from './helpers.js';

const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(200, 1),
]);
const HTML_DISFARCADO = Buffer.from('<html><script>alert(document.cookie)</script></html>');

describe('photo uploads', () => {
  let app: FastifyInstance;
  let conta: Conta;
  let proposta: { id: string };

  beforeAll(async () => {
    app = await criarApp();
    conta = await registrarConta(app);
    proposta = await criarProposta(app, conta);
  });

  afterAll(async () => {
    await app.close();
  });

  function pedirUrl(contentType: string, size: number) {
    return chamar(app, {
      method: 'POST',
      url: '/api/v1/assets/upload-url',
      token: conta.accessToken,
      payload: { proposalId: proposta.id, contentType, size },
    });
  }

  function anexar(s3ObjectKey: string, mimeType = 'image/png') {
    return chamar(app, {
      method: 'PATCH',
      url: `/api/v1/proposals/${proposta.id}`,
      token: conta.accessToken,
      payload: { assets: [{ s3ObjectKey, mimeType, position: 0 }] },
    });
  }

  async function enviar(contentType: string, corpo: Buffer, tamanhoDeclarado = corpo.length) {
    const destino = await pedirUrl(contentType, tamanhoDeclarado);
    expect(destino.statusCode).toBe(200);
    const { key, uploadUrl } = destino.json() as { key: string; uploadUrl: string };
    const envio = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, body: corpo });
    return { key, envio };
  }

  it.each(['text/html', 'image/svg+xml', 'application/pdf', 'application/x-msdownload'])(
    'refuses an upload URL for %s',
    async (tipo) => {
      expect((await pedirUrl(tipo, 100)).statusCode).toBe(400);
    },
  );

  it('refuses an upload URL for a file over 5MB', async () => {
    expect((await pedirUrl('image/png', 5 * 1024 * 1024 + 1)).statusCode).toBe(400);
  });

  it('hands out random keys with the right extension', async () => {
    const [a, b] = await Promise.all([pedirUrl('image/png', 100), pedirUrl('image/jpeg', 100)]);
    const chaveA = a.json().key as string;
    const chaveB = b.json().key as string;
    expect(chaveA).toMatch(new RegExp(`^accounts/${conta.accountId}/proposals/${proposta.id}/photos/[a-z0-9]{12}\\.png$`));
    expect(chaveB).toMatch(/\.jpg$/);
    expect(chaveA.split('/').pop()).not.toBe(chaveB.split('/').pop());
  });

  it('the signed URL rejects a body larger than declared', async () => {
    const { envio } = await enviar('image/png', Buffer.concat([PNG, Buffer.alloc(5000)]), PNG.length);
    expect(envio.ok).toBe(false);
  });

  it('accepts a real PNG and stores the sniffed type', async () => {
    const { key, envio } = await enviar('image/png', PNG);
    expect(envio.ok).toBe(true);
    const resposta = await anexar(key, 'application/octet-stream');
    expect(resposta.statusCode).toBe(200);
    expect(resposta.json().data.assets[0].mimeType).toBe('image/png');
  });

  it('returns a link to view each attached photo', async () => {
    const { key } = await enviar('image/png', PNG);
    await anexar(key);

    const resposta = await chamar(app, { method: 'GET', url: `/api/v1/proposals/${proposta.id}`, token: conta.accessToken });
    const foto = resposta.json().data.assets[0] as { url: string };
    const download = await fetch(foto.url);
    expect(download.ok).toBe(true);
    expect(Buffer.from(await download.arrayBuffer()).subarray(0, 4)).toEqual(PNG.subarray(0, 4));
  });

  it('rejects HTML disguised as a PNG', async () => {
    const { key, envio } = await enviar('image/png', HTML_DISFARCADO);
    expect(envio.ok).toBe(true);
    const resposta = await anexar(key);
    expect(resposta.statusCode).toBe(400);
  });

  it('rejects a key that was never uploaded', async () => {
    const resposta = await anexar(`accounts/${conta.accountId}/proposals/${proposta.id}/photos/zzzzzzzzzzzz.png`);
    expect(resposta.statusCode).toBe(400);
  });

  it.each([
    (c: Conta, p: string) => `accounts/${c.accountId}/proposals/${p}/proposta.pdf`,
    (c: Conta, p: string) => `accounts/${c.accountId}/proposals/${p}/photos/../../outra/photos/abcabcabcabc.png`,
    (c: Conta, p: string) => `accounts/${c.accountId}/proposals/${p}/photos/nested/abcabcabcabc.png`,
  ])('rejects keys outside the photo folder (%#)', async (montar) => {
    expect((await anexar(montar(conta, proposta.id))).statusCode).toBe(400);
  });
});
