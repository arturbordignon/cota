import { Writable } from 'node:stream';
import fastify from 'fastify';
import { describe, expect, it } from 'vitest';

import { criarOpcoesDeLog, ocultarSegredosDaUrl } from '../src/utils/logs.js';

describe('request logs', () => {
  it.each([
    ['/api/v1/team/invite/preview?token=abc123', '/api/v1/team/invite/preview?token=[redacted]'],
    ['/accept-invite?lang=pt&token=abc&x=1', '/accept-invite?lang=pt&token=[redacted]&x=1'],
    ['/x?refreshToken=r1&password=p1', '/x?refreshToken=[redacted]&password=[redacted]'],
    ['/api/v1/clients?search=token', '/api/v1/clients?search=token'],
  ])('hides secrets in %s', (url, esperado) => {
    expect(ocultarSegredosDaUrl(url)).toBe(esperado);
  });

  it('never writes the invite token or the bearer token to the log stream', async () => {
    const linhas: string[] = [];
    const destino = new Writable({
      write(pedaco, _codificacao, pronto) {
        linhas.push(pedaco.toString());
        pronto();
      },
    });
    const app = fastify({
      logger: { ...criarOpcoesDeLog('info'), stream: destino },
    });
    app.get('/invite/preview', async () => ({ ok: true }));
    await app.inject({
      method: 'GET',
      url: '/invite/preview?token=segredo-do-convite',
      headers: { authorization: 'Bearer segredo-do-acesso' },
    });
    await app.close();

    const log = linhas.join('');
    expect(log).toContain('/invite/preview?token=[redacted]');
    expect(log).not.toContain('segredo-do-convite');
    expect(log).not.toContain('segredo-do-acesso');
  });
});
