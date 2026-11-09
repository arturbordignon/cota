import cors from 'cors';
import express, { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
// eslint-disable-next-line import/no-unresolved
import { requireBearerAuth } from '@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js';
// eslint-disable-next-line import/no-unresolved
import { getOAuthProtectedResourceMetadataUrl, mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
// eslint-disable-next-line import/no-unresolved
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { ClienteCota } from './cliente-api.js';
import type { ConfiguracaoHttp } from './config.js';
import type { Armazem } from './oauth/armazem.js';
import { CABECALHOS_PAGINA, escolherIdioma, lerIdioma, paginaDeAviso, paginaDeEntrada } from './oauth/pagina.js';
import { ErroEntrada, ESCOPO, ProvedorCota, SessaoEncerrada } from './oauth/provedor.js';
import { criarServidor } from './servidor.js';

function campo(corpo: unknown, nome: string) {
  const valor = (corpo as Record<string, unknown> | undefined)?.[nome];
  return typeof valor === 'string' ? valor : '';
}

// The hosted MCP server customers connect from Claude or ChatGPT. Each
// request is handled on its own (stateless Streamable HTTP), so any number of
// replicas can sit behind the load balancer as long as they share Redis.
export function criarAppHttp(config: ConfiguracaoHttp, armazem: Armazem) {
  const provedor = new ProvedorCota(armazem, config);
  const metadadosDoRecurso = getOAuthProtectedResourceMetadataUrl(provedor.urlMcp);

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.confiarProxy);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(
    mcpAuthRouter({
      provider: provedor,
      issuerUrl: new URL(config.urlPublica),
      resourceServerUrl: provedor.urlMcp,
      scopesSupported: [ESCOPO],
      resourceName: 'Cota',
      serviceDocumentationUrl: new URL('/account', config.urlWeb),
      // Clients keep their registration; an expiring secret would silently
      // disconnect them a month later.
      clientRegistrationOptions: { clientSecretExpirySeconds: 0 },
    }),
  );

  app.post(
    '/entrar',
    rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false }),
    urlencoded({ extended: false, limit: '10kb' }),
    async (req: Request, res: Response) => {
      const idioma = lerIdioma(campo(req.body, 'idioma')) ?? escolherIdioma(req.headers['accept-language']);
      const pedidoId = campo(req.body, 'pedido');
      const conta = campo(req.body, 'conta');
      const email = campo(req.body, 'email');
      res.set(CABECALHOS_PAGINA);

      const encontrado = pedidoId ? await provedor.lerPedido(pedidoId) : null;
      if (!encontrado) {
        res.status(400).type('html').send(paginaDeAviso(idioma, 'expirado'));
        return;
      }

      try {
        const destino = await provedor.concluirEntrada(pedidoId, { conta, email, senha: campo(req.body, 'senha') });
        res.redirect(302, destino);
      } catch (erro) {
        const motivo = erro instanceof ErroEntrada ? erro.motivo : 'indisponivel';
        const status = erro instanceof ErroEntrada ? erro.status : 503;
        if (!(erro instanceof ErroEntrada)) {
          console.error('Falha ao conectar uma conta', erro);
        }
        if (motivo === 'expirado') {
          res.status(status).type('html').send(paginaDeAviso(idioma, motivo));
          return;
        }
        res
          .status(status)
          .type('html')
          .send(
            paginaDeEntrada({
              idioma,
              pedido: pedidoId,
              nomeApp: encontrado.cliente.client_name,
              redirectUri: encontrado.pedido.redirectUri,
              erro: motivo,
              conta,
              email,
            }),
          );
      }
    },
  );

  // Bearer tokens, not cookies, so any origin may call it (web-based clients).
  const corsMcp = cors({ origin: '*', exposedHeaders: ['WWW-Authenticate', 'Mcp-Session-Id'] });
  const autenticar = requireBearerAuth({
    verifier: provedor,
    requiredScopes: [ESCOPO],
    resourceMetadataUrl: metadadosDoRecurso,
    expectedResource: provedor.urlMcp,
  });

  const recusarSessao = (res: Response) => {
    res
      .status(401)
      .set(
        'WWW-Authenticate',
        `Bearer error="invalid_token", error_description="The Cota session ended", resource_metadata="${metadadosDoRecurso}"`,
      )
      .json({ error: 'invalid_token', error_description: 'The Cota session ended. Connect again.' });
  };

  app.options('/mcp', corsMcp);
  app.post('/mcp', corsMcp, autenticar, json({ limit: '1mb' }), async (req: Request, res: Response) => {
    const sessaoId = String(req.auth?.extra?.sessaoId ?? '');
    const dados = sessaoId ? await provedor.lerSessao(sessaoId) : null;
    if (!dados) {
      recusarSessao(res);
      return;
    }

    const sessao = provedor.sessao(sessaoId);
    try {
      await sessao.tokenAtual();
    } catch (erro) {
      if (erro instanceof SessaoEncerrada) {
        recusarSessao(res);
        return;
      }
      throw erro;
    }

    const api = new ClienteCota(sessao, { urlApi: config.urlApi, urlWeb: config.urlWeb }, dados.idioma);
    const servidor = criarServidor(api);
    const transporte = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => {
      void transporte.close();
      void servidor.close();
    });
    await servidor.connect(transporte);
    await transporte.handleRequest(req, res, req.body);
  });

  // Stateless: no server-sent stream to open and no session to close.
  app.all('/mcp', corsMcp, (_req: Request, res: Response) => {
    res
      .status(405)
      .set('Allow', 'POST, OPTIONS')
      .json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null });
  });

  app.use((erro: unknown, _req: Request, res: Response, _proximo: NextFunction) => {
    console.error('Erro no servidor MCP', erro);
    if (!res.headersSent) {
      res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
    }
  });

  return { app, provedor };
}
