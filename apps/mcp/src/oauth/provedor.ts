import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
// eslint-disable-next-line import/no-unresolved
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
// eslint-disable-next-line import/no-unresolved
import { InvalidGrantError, InvalidTargetError, InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
// eslint-disable-next-line import/no-unresolved
import type { AuthorizationParams, OAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/provider.js';
// eslint-disable-next-line import/no-unresolved
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
// eslint-disable-next-line import/no-unresolved
import type { OAuthClientInformationFull, OAuthTokenRevocationRequest, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';

import {
  entrarNaApi,
  ErroApi,
  expiracaoDoToken,
  renovarNaApi,
  sairDaApi,
  type Sessao,
  type TokensApi,
} from '../cliente-api.js';
import type { Armazem } from './armazem.js';
import { CABECALHOS_PAGINA, escolherIdioma, paginaDeEntrada, type MotivoErro } from './pagina.js';

export const ESCOPO = 'cota';
const VALIDADE_PEDIDO = 10 * 60;
const VALIDADE_CODIGO = 5 * 60;
const VALIDADE_ACESSO = 60 * 60;
// Same as the API's own refresh tokens: a connector unused for a week asks the
// person to sign in again, like the dashboard does.
const VALIDADE_REFRESH = 7 * 24 * 60 * 60;
// A used refresh token keeps working this long, so a client that retries a
// refresh after a network hiccup isn't disconnected.
const TOLERANCIA_REFRESH = 30;
// A registered app that hasn't connected anyone in this long is forgotten, so
// registrations nobody uses don't pile up. Each new token renews it.
const VALIDADE_CLIENTE = 180 * 24 * 60 * 60;

export type Pedido = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
  scopes: string[];
  resource: string;
};

type Codigo = Pedido & { sessaoId: string };

export type DadosSessao = {
  clientId: string;
  usuarioId: string;
  contaId: string;
  idioma: string;
  tokensApi: TokensApi;
};

type DadosToken = {
  sessaoId: string;
  clientId: string;
  scopes: string[];
  resource: string;
};

function novoSegredo() {
  return randomBytes(32).toString('base64url');
}

// Tokens are stored by their hash, so a copy of the store can't be replayed.
function resumo(token: string) {
  return createHash('sha256').update(token).digest('base64url');
}

export class SessaoEncerrada extends Error {
  constructor() {
    super('A sessão do Cota terminou. Conecte de novo.');
    this.name = 'SessaoEncerrada';
  }
}

export class ErroEntrada extends Error {
  constructor(
    readonly motivo: MotivoErro,
    readonly status: number,
  ) {
    super(motivo);
    this.name = 'ErroEntrada';
  }
}

const renovacoesEmAndamento = new Map<string, Promise<string>>();

// The Cota session behind one connection. The API access token lasts 15
// minutes; it is renewed with the API refresh token when needed, one renewal
// at a time per session.
class SessaoConectada implements Sessao {
  constructor(
    private readonly armazem: Armazem,
    private readonly id: string,
    private readonly urlApi: string,
  ) {}

  async tokenAtual() {
    const sessao = await this.armazem.ler<DadosSessao>(`sessao:${this.id}`);
    if (!sessao) {
      throw new SessaoEncerrada();
    }
    if (expiracaoDoToken(sessao.tokensApi.accessToken) - 30 > Date.now() / 1000) {
      return sessao.tokensApi.accessToken;
    }
    return this.renovar();
  }

  renovar() {
    let emAndamento = renovacoesEmAndamento.get(this.id);
    if (!emAndamento) {
      emAndamento = this.renovarAgora().finally(() => renovacoesEmAndamento.delete(this.id));
      renovacoesEmAndamento.set(this.id, emAndamento);
    }
    return emAndamento;
  }

  private async renovarAgora() {
    const sessao = await this.armazem.ler<DadosSessao>(`sessao:${this.id}`);
    if (!sessao) {
      throw new SessaoEncerrada();
    }
    let tokens: TokensApi;
    try {
      tokens = await renovarNaApi(this.urlApi, sessao.tokensApi.refreshToken);
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 401) {
        await this.armazem.apagar(`sessao:${this.id}`);
        throw new SessaoEncerrada();
      }
      throw erro;
    }
    await this.armazem.atualizar(`sessao:${this.id}`, { ...sessao, tokensApi: tokens });
    return tokens.accessToken;
  }
}

// OAuth 2.1 authorization server for Claude, ChatGPT and other MCP clients:
// dynamic client registration, PKCE, rotating refresh tokens. Signing in
// opens a normal Cota session (same login as the dashboard), so the assistant
// has exactly the person's permissions.
export class ProvedorCota implements OAuthServerProvider {
  readonly urlMcp: URL;

  constructor(
    private readonly armazem: Armazem,
    private readonly config: { urlPublica: string; urlApi: string },
  ) {
    this.urlMcp = new URL('/mcp', config.urlPublica);
  }

  get clientsStore(): OAuthRegisteredClientsStore {
    return {
      getClient: async (id: string) => (await this.armazem.ler<OAuthClientInformationFull>(`cliente:${id}`)) ?? undefined,
      registerClient: async (cliente) => {
        const completo = cliente as OAuthClientInformationFull;
        await this.armazem.definir(`cliente:${completo.client_id}`, completo, VALIDADE_CLIENTE);
        return completo;
      },
    };
  }

  // Tokens are only ever for this server, whatever address form the client uses.
  private recurso(pedido?: URL | string) {
    if (!pedido) {
      return this.urlMcp.href;
    }
    let url: URL;
    try {
      url = new URL(String(pedido));
    } catch {
      throw new InvalidTargetError('Unknown resource.');
    }
    if (url.origin !== this.urlMcp.origin) {
      throw new InvalidTargetError('This server only issues tokens for itself.');
    }
    return this.urlMcp.href;
  }

  async authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response) {
    const pedido: Pedido = {
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      codeChallenge: params.codeChallenge,
      state: params.state,
      scopes: [ESCOPO],
      resource: this.recurso(params.resource),
    };
    const id = novoSegredo();
    await this.armazem.definir(`pedido:${id}`, pedido, VALIDADE_PEDIDO);
    res
      .status(200)
      .set(CABECALHOS_PAGINA)
      .type('html')
      .send(
        paginaDeEntrada({
          idioma: escolherIdioma(res.req.headers['accept-language']),
          pedido: id,
          nomeApp: client.client_name,
          redirectUri: pedido.redirectUri,
        }),
      );
  }

  async lerPedido(id: string) {
    const pedido = await this.armazem.ler<Pedido>(`pedido:${id}`);
    if (!pedido) {
      return null;
    }
    const cliente = await this.clientsStore.getClient(pedido.clientId);
    if (!cliente) {
      return null;
    }
    return { pedido, cliente };
  }

  // The form on the sign-in page: signs in to the API, opens the session and
  // sends the person back to the app with a one-time code.
  async concluirEntrada(id: string, credenciais: { conta: string; email: string; senha: string }) {
    const encontrado = await this.lerPedido(id);
    if (!encontrado) {
      throw new ErroEntrada('expirado', 400);
    }
    const { pedido } = encontrado;

    let login;
    try {
      login = await entrarNaApi(this.config.urlApi, credenciais.conta.trim(), credenciais.email.trim(), credenciais.senha);
    } catch (erro) {
      if (erro instanceof ErroApi && (erro.status === 401 || erro.status === 400)) {
        throw new ErroEntrada('credenciais', 401);
      }
      if (erro instanceof ErroApi && erro.status === 429) {
        throw new ErroEntrada('tentativas', 429);
      }
      throw new ErroEntrada('indisponivel', 503);
    }

    // The request is used once; a second form post finds nothing.
    if (!(await this.armazem.tomar<Pedido>(`pedido:${id}`))) {
      await sairDaApi(this.config.urlApi, login.tokens.refreshToken);
      throw new ErroEntrada('expirado', 400);
    }

    const sessaoId = novoSegredo();
    const sessao: DadosSessao = {
      clientId: pedido.clientId,
      usuarioId: login.user.id,
      contaId: login.account.id,
      idioma: login.user.locale || login.account.locale || 'pt-BR',
      tokensApi: login.tokens,
    };
    await this.armazem.definir(`sessao:${sessaoId}`, sessao, VALIDADE_REFRESH);

    const codigo = novoSegredo();
    await this.armazem.definir(`codigo:${resumo(codigo)}`, { ...pedido, sessaoId } satisfies Codigo, VALIDADE_CODIGO);

    const destino = new URL(pedido.redirectUri);
    destino.searchParams.set('code', codigo);
    if (pedido.state) {
      destino.searchParams.set('state', pedido.state);
    }
    return destino.href;
  }

  async challengeForAuthorizationCode(client: OAuthClientInformationFull, codigo: string) {
    const dados = await this.armazem.ler<Codigo>(`codigo:${resumo(codigo)}`);
    if (!dados || dados.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid authorization code');
    }
    return dados.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    codigo: string,
    _verificador?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const dados = await this.armazem.tomar<Codigo>(`codigo:${resumo(codigo)}`);
    if (!dados || dados.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid authorization code');
    }
    if (redirectUri && redirectUri !== dados.redirectUri) {
      throw new InvalidGrantError('redirect_uri does not match the authorization request');
    }
    if (resource && this.recurso(resource) !== dados.resource) {
      throw new InvalidGrantError('resource does not match the authorization request');
    }
    return this.emitir({ sessaoId: dados.sessaoId, clientId: dados.clientId, scopes: dados.scopes, resource: dados.resource });
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const chave = `refresh:${resumo(refreshToken)}`;
    const dados = await this.armazem.ler<DadosToken>(chave);
    if (!dados || dados.clientId !== client.client_id) {
      throw new InvalidGrantError('Invalid refresh token');
    }
    if (resource && this.recurso(resource) !== dados.resource) {
      throw new InvalidGrantError('resource does not match the original grant');
    }
    await this.armazem.encurtar(chave, TOLERANCIA_REFRESH);

    // Renewing the Cota session here keeps it alive while the connector is in use.
    try {
      await this.sessao(dados.sessaoId).renovar();
    } catch (erro) {
      if (erro instanceof SessaoEncerrada) {
        await this.armazem.apagar(chave);
        throw new InvalidGrantError('The Cota session ended. Connect again.');
      }
      throw erro;
    }

    let escopos = dados.scopes;
    if (scopes?.length) {
      escopos = scopes.filter((escopo) => dados.scopes.includes(escopo));
    }
    return this.emitir({ ...dados, scopes: escopos });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const dados = await this.armazem.ler<DadosToken & { expiraEm: number }>(`acesso:${resumo(token)}`);
    if (!dados) {
      throw new InvalidTokenError('Invalid or expired token');
    }
    return {
      token,
      clientId: dados.clientId,
      scopes: dados.scopes,
      expiresAt: dados.expiraEm,
      resource: new URL(dados.resource),
      extra: { sessaoId: dados.sessaoId },
    };
  }

  // Revoking the refresh token disconnects: the Cota session is closed too.
  async revokeToken(client: OAuthClientInformationFull, pedido: OAuthTokenRevocationRequest) {
    const hash = resumo(pedido.token);
    const acesso = await this.armazem.ler<DadosToken>(`acesso:${hash}`);
    if (acesso && acesso.clientId === client.client_id) {
      await this.armazem.apagar(`acesso:${hash}`);
      return;
    }
    const refresh = await this.armazem.ler<DadosToken>(`refresh:${hash}`);
    if (refresh && refresh.clientId === client.client_id) {
      await this.armazem.apagar(`refresh:${hash}`);
      await this.desconectar(refresh.sessaoId);
    }
  }

  sessao(sessaoId: string): Sessao {
    return new SessaoConectada(this.armazem, sessaoId, this.config.urlApi);
  }

  async lerSessao(sessaoId: string) {
    return this.armazem.ler<DadosSessao>(`sessao:${sessaoId}`);
  }

  async desconectar(sessaoId: string) {
    const sessao = await this.armazem.tomar<DadosSessao>(`sessao:${sessaoId}`);
    if (sessao) {
      await sairDaApi(this.config.urlApi, sessao.tokensApi.refreshToken);
    }
  }

  private async emitir(dados: DadosToken): Promise<OAuthTokens> {
    const acesso = novoSegredo();
    const refresh = novoSegredo();
    const expiraEm = Math.floor(Date.now() / 1000) + VALIDADE_ACESSO;
    await this.armazem.definir(`acesso:${resumo(acesso)}`, { ...dados, expiraEm }, VALIDADE_ACESSO);
    await this.armazem.definir(`refresh:${resumo(refresh)}`, dados, VALIDADE_REFRESH);
    await this.armazem.prolongar(`sessao:${dados.sessaoId}`, VALIDADE_REFRESH);
    await this.armazem.prolongar(`cliente:${dados.clientId}`, VALIDADE_CLIENTE);
    return {
      access_token: acesso,
      token_type: 'Bearer',
      expires_in: VALIDADE_ACESSO,
      refresh_token: refresh,
      scope: dados.scopes.join(' '),
    };
  }
}
