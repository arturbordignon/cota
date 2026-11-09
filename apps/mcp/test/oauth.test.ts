import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import express, { json } from 'express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ConfiguracaoHttp } from '../src/config.js';
import { criarAppHttp } from '../src/http.js';
import { ArmazemMemoria } from '../src/oauth/armazem.js';

// A JWT-shaped token the MCP server can read the expiry from.
function tokenApi(segundos: number) {
  const corpo = Buffer.from(JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + segundos })).toString('base64url');
  return `eyJhbGciOiJIUzI1NiJ9.${corpo}.assinatura`;
}

function escutar(app: express.Express, porta = 0) {
  return new Promise<Server>((resolver) => {
    const servidor = app.listen(porta, '127.0.0.1', () => resolver(servidor));
  });
}

function portaLivre() {
  return new Promise<number>((resolver) => {
    const servidor = createServer();
    servidor.listen(0, '127.0.0.1', () => {
      const { port } = servidor.address() as AddressInfo;
      servidor.close(() => resolver(port));
    });
  });
}

describe('connecting Claude or ChatGPT through OAuth', () => {
  let apiFalsa: Server;
  let mcp: Server;
  let base: string;
  const estado = { refreshAceito: true, logins: 0, saidas: 0 };
  const redirectUri = 'https://claude.ai/api/mcp/auth_callback';
  let clientId = '';

  beforeAll(async () => {
    const api = express();
    api.use(json());
    api.post('/api/v1/auth/login', (req, res) => {
      if (req.body.password !== 'senha-certa-123') {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }
      estado.logins += 1;
      res.json({
        tokens: { accessToken: tokenApi(900), refreshToken: `refresh-${estado.logins}` },
        user: { id: 'u1', email: req.body.email, role: 'OWNER', locale: 'pt-BR' },
        account: { id: 'a1', name: 'Horizonte', slug: req.body.accountSlug, locale: 'pt-BR' },
      });
    });
    api.post('/api/v1/auth/refresh', (_req, res) => {
      if (!estado.refreshAceito) {
        res.status(401).json({ message: 'Invalid refresh token' });
        return;
      }
      res.json({ tokens: { accessToken: tokenApi(900), refreshToken: `refresh-${randomBytes(4).toString('hex')}` } });
    });
    api.post('/api/v1/auth/logout', (_req, res) => {
      estado.saidas += 1;
      res.status(204).end();
    });
    api.get('/api/v1/auth/me', (_req, res) => {
      res.json({ user: { name: 'Ana', role: 'OWNER' }, account: { name: 'Horizonte', locale: 'pt-BR' }, permissions: {} });
    });
    api.get('/api/v1/account', (_req, res) => res.json({ data: { company: { name: 'Horizonte' } } }));
    api.get('/api/v1/account/proposal-defaults', (_req, res) => res.json({ data: { terms: [], team: [], validityDays: null } }));
    api.get('/api/v1/billing/overview', (_req, res) =>
      res.json({ data: { plan: { name: 'Teste grátis', isTrial: true }, usage: { used: 0, total: 10 }, canCreate: true } }),
    );
    for (const caminho of ['/api/v1/templates', '/api/v1/equipment', '/api/v1/clients']) {
      api.get(caminho, (_req, res) => res.json({ data: [] }));
    }
    apiFalsa = await escutar(api);

    const porta = await portaLivre();
    base = `http://localhost:${porta}`;
    const config: ConfiguracaoHttp = {
      urlApi: `http://127.0.0.1:${(apiFalsa.address() as AddressInfo).port}/api/v1`,
      urlWeb: 'https://app.cota.test',
      urlPublica: base,
      host: '127.0.0.1',
      porta,
      redis: null,
      confiarProxy: false,
      producao: false,
    };
    mcp = await escutar(criarAppHttp(config, new ArmazemMemoria()).app, porta);
  });

  afterAll(async () => {
    await new Promise((resolver) => mcp.close(resolver));
    await new Promise((resolver) => apiFalsa.close(resolver));
  });

  function pkce() {
    const verificador = randomBytes(32).toString('base64url');
    const desafio = createHash('sha256').update(verificador).digest('base64url');
    return { verificador, desafio };
  }

  async function chamarMcp(token: string, corpo: object) {
    return fetch(`${base}/mcp`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...corpo }),
    });
  }

  async function trocarToken(parametros: Record<string, string>) {
    return fetch(`${base}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, ...parametros }),
    });
  }

  // Runs the whole browser part: the sign-in page and the form post.
  async function conectar(senha = 'senha-certa-123') {
    const { verificador, desafio } = pkce();
    const autorizacao = new URL(`${base}/authorize`);
    autorizacao.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: desafio,
      code_challenge_method: 'S256',
      state: 'estado-123',
      resource: `${base}/mcp`,
    }).toString();
    const pagina = await fetch(autorizacao, { headers: { 'Accept-Language': 'pt-BR' } });
    const html = await pagina.text();
    const pedido = /name="pedido" value="([^"]+)"/.exec(html)?.[1] ?? '';
    const entrada = await fetch(`${base}/entrar`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ pedido, idioma: 'pt-BR', conta: 'horizonte', email: 'ana@horizonte.test', senha }),
    });
    return { pagina, html, pedido, entrada, verificador };
  }

  it('advertises where to sign in', async () => {
    const semToken = await fetch(`${base}/mcp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(semToken.status).toBe(401);
    expect(semToken.headers.get('www-authenticate')).toContain(`resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`);

    const recurso = await (await fetch(`${base}/.well-known/oauth-protected-resource/mcp`)).json();
    expect(recurso).toMatchObject({ resource: `${base}/mcp`, authorization_servers: [`${base}/`] });

    const servidor = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
    expect(servidor).toMatchObject({
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`,
      code_challenge_methods_supported: ['S256'],
    });
  });

  it('registers the app', async () => {
    const resposta = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_name: 'Claude', redirect_uris: [redirectUri], token_endpoint_auth_method: 'none' }),
    });
    expect(resposta.status).toBe(201);
    clientId = (await resposta.json()).client_id;
    expect(clientId).toBeTruthy();
  });

  it('shows the sign-in page with the app and where it returns to', async () => {
    const { pagina, html } = await conectar('errada-mas-longa');
    expect(pagina.status).toBe(200);
    expect(pagina.headers.get('x-frame-options')).toBe('DENY');
    expect(html).toContain('Claude (claude.ai) quer montar e salvar propostas');
  });

  it('keeps the person on the page when the password is wrong', async () => {
    const { entrada } = await conectar('errada-mas-longa');
    expect(entrada.status).toBe(401);
    expect(await entrada.text()).toContain('Conta, e-mail ou senha incorretos.');
  });

  it('signs in, hands out tokens once, and serves the tools', async () => {
    const { entrada, verificador } = await conectar();
    expect(entrada.status).toBe(302);
    const volta = new URL(entrada.headers.get('location') ?? '');
    expect(`${volta.origin}${volta.pathname}`).toBe(redirectUri);
    expect(volta.searchParams.get('state')).toBe('estado-123');
    const codigo = volta.searchParams.get('code') ?? '';

    const errado = await trocarToken({ grant_type: 'authorization_code', code: codigo, code_verifier: 'x'.repeat(43), redirect_uri: redirectUri });
    expect(errado.status).toBe(400);

    const resposta = await trocarToken({ grant_type: 'authorization_code', code: codigo, code_verifier: verificador, redirect_uri: redirectUri });
    expect(resposta.status).toBe(200);
    const tokens = await resposta.json();
    expect(tokens).toMatchObject({ token_type: 'Bearer', expires_in: 3600, scope: 'cota' });

    const repetido = await trocarToken({ grant_type: 'authorization_code', code: codigo, code_verifier: verificador, redirect_uri: redirectUri });
    expect(repetido.status).toBe(400);

    const inicio = await chamarMcp(tokens.access_token, {
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '1' } },
    });
    expect(inicio.status).toBe(200);
    const inicioCorpo = await inicio.json();
    expect(inicioCorpo.result.serverInfo.name).toBe('cota');
    expect(inicioCorpo.result.instructions).toContain('preparar_proposta');

    const ferramentas = await (await chamarMcp(tokens.access_token, { method: 'tools/list', params: {} })).json();
    const nomes = ferramentas.result.tools.map((ferramenta: { name: string }) => ferramenta.name);
    expect(nomes).toEqual(expect.arrayContaining(['preparar_proposta', 'montar_proposta', 'editar_proposta', 'salvar_padroes']));

    const prompts = await (await chamarMcp(tokens.access_token, { method: 'prompts/list', params: {} })).json();
    expect(prompts.result.prompts.map((prompt: { name: string }) => prompt.name)).toEqual(['nova_proposta', 'configurar_conta']);

    const preparo = await (
      await chamarMcp(tokens.access_token, { method: 'tools/call', params: { name: 'preparar_proposta', arguments: {} } })
    ).json();
    expect(JSON.parse(preparo.result.content[0].text)).toMatchObject({ modo: 'guiado', plano: { podeCriar: true } });

    // Refresh: a new pair, and the Cota session is renewed along with it.
    const renovado = await trocarToken({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
    expect(renovado.status).toBe(200);
    const novos = await renovado.json();
    expect(novos.refresh_token).not.toBe(tokens.refresh_token);

    // Disconnecting from the app closes the Cota session too.
    const saidasAntes = estado.saidas;
    const revogado = await fetch(`${base}/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, token: novos.refresh_token }),
    });
    expect(revogado.status).toBe(200);
    expect(estado.saidas).toBe(saidasAntes + 1);
    expect((await chamarMcp(novos.access_token, { method: 'tools/list', params: {} })).status).toBe(401);
  });

  it('asks to connect again when the Cota session has ended', async () => {
    const { entrada, verificador } = await conectar();
    const codigo = new URL(entrada.headers.get('location') ?? '').searchParams.get('code') ?? '';
    const tokens = await (
      await trocarToken({ grant_type: 'authorization_code', code: codigo, code_verifier: verificador, redirect_uri: redirectUri })
    ).json();

    estado.refreshAceito = false;
    try {
      const renovado = await trocarToken({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token });
      expect(renovado.status).toBe(400);
      expect((await renovado.json()).error).toBe('invalid_grant');
    } finally {
      estado.refreshAceito = true;
    }
  });

  it('refuses tokens for another server', async () => {
    const { desafio } = pkce();
    const autorizacao = new URL(`${base}/authorize`);
    autorizacao.search = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: desafio,
      code_challenge_method: 'S256',
      resource: 'https://outro-servidor.test/mcp',
    }).toString();
    const resposta = await fetch(autorizacao, { redirect: 'manual' });
    expect(resposta.status).toBe(302);
    expect(new URL(resposta.headers.get('location') ?? '').searchParams.get('error')).toBe('invalid_target');
  });
});
