export type OpcoesPedido = {
  metodo?: string;
  corpo?: unknown;
  query?: Record<string, string | undefined>;
};

export type TokensApi = {
  accessToken: string;
  refreshToken: string;
};

export type RespostaLogin = {
  tokens: TokensApi;
  user: { id: string; email: string; role: string; locale?: string | null };
  account: { id: string; name: string; slug: string; locale?: string | null };
};

// An answer from the API that was not a success. Keeps the status and the
// machine-readable code (e.g. TRIAL_ENDED) so tools can explain what to do.
export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo?: string,
    readonly linkPlanos?: string,
  ) {
    super(message);
    this.name = 'ErroApi';
  }
}

// Where the API token comes from: a fixed login (local stdio use) or the
// session a person opened when they connected Claude or ChatGPT.
export interface Sessao {
  tokenAtual(): Promise<string>;
  renovar(tokenRecusado?: string): Promise<string>;
}

type Enderecos = { urlApi: string; urlWeb: string };

async function lerResposta(resposta: Response) {
  const texto = await resposta.text();
  let dados: unknown = {};
  if (texto) {
    try {
      dados = JSON.parse(texto);
    } catch {
      dados = { message: texto };
    }
  }
  if (resposta.ok) {
    return dados;
  }

  let mensagem = `A API respondeu ${resposta.status}`;
  let codigo: string | undefined;
  let linkPlanos: string | undefined;
  if (dados && typeof dados === 'object') {
    const corpo = dados as { message?: unknown; code?: unknown; plansUrl?: unknown };
    if (typeof corpo.message === 'string' && corpo.message) {
      mensagem = corpo.message;
    }
    if (typeof corpo.code === 'string') {
      codigo = corpo.code;
    }
    if (typeof corpo.plansUrl === 'string') {
      linkPlanos = corpo.plansUrl;
    }
  }
  throw new ErroApi(mensagem, resposta.status, codigo, linkPlanos);
}

function enviar(urlApi: string, caminho: string, opcoes: OpcoesPedido, token: string, idioma = 'pt-BR') {
  const url = new URL(`${urlApi}${caminho}`);
  for (const [chave, valor] of Object.entries(opcoes.query ?? {})) {
    if (valor) {
      url.searchParams.set(chave, valor);
    }
  }

  const cabecalhos: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': idioma,
  };
  if (token) {
    cabecalhos.Authorization = `Bearer ${token}`;
  }
  let corpo: string | undefined;
  if (opcoes.corpo !== undefined) {
    cabecalhos['Content-Type'] = 'application/json';
    corpo = JSON.stringify(opcoes.corpo);
  }

  return fetch(url, { method: opcoes.metodo ?? 'GET', headers: cabecalhos, body: corpo });
}

export async function entrarNaApi(urlApi: string, conta: string, email: string, senha: string) {
  const resposta = await enviar(
    urlApi,
    '/auth/login',
    { metodo: 'POST', corpo: { accountSlug: conta, email, password: senha } },
    '',
  );
  const dados = (await lerResposta(resposta)) as Partial<RespostaLogin>;
  if (!dados.tokens?.accessToken || !dados.tokens.refreshToken || !dados.user || !dados.account) {
    throw new Error('A API não devolveu a sessão.');
  }
  return dados as RespostaLogin;
}

export async function renovarNaApi(urlApi: string, refreshToken: string) {
  const resposta = await enviar(urlApi, '/auth/refresh', { metodo: 'POST', corpo: { refreshToken } }, '');
  const dados = (await lerResposta(resposta)) as { tokens?: Partial<TokensApi> };
  if (!dados.tokens?.accessToken || !dados.tokens.refreshToken) {
    throw new Error('A API não devolveu tokens de sessão.');
  }
  return dados.tokens as TokensApi;
}

export async function sairDaApi(urlApi: string, refreshToken: string) {
  await enviar(urlApi, '/auth/logout', { metodo: 'POST', corpo: { refreshToken } }, '').catch(() => undefined);
}

// Seconds since epoch when an API access token stops working, read from the
// token itself (no need to verify it: the API does that on every call).
export function expiracaoDoToken(token: string) {
  const partes = token.split('.');
  if (partes.length !== 3) {
    return 0;
  }
  try {
    const dados = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8')) as { exp?: unknown };
    return typeof dados.exp === 'number' ? dados.exp : 0;
  } catch {
    return 0;
  }
}

export class ClienteCota {
  constructor(
    private readonly sessao: Sessao,
    private readonly enderecos: Enderecos,
    private readonly idioma = 'pt-BR',
  ) {}

  urlWeb() {
    return this.enderecos.urlWeb;
  }

  async get(caminho: string, query?: Record<string, string | undefined>) {
    return this.chamar(caminho, { metodo: 'GET', query });
  }

  async post(caminho: string, corpo?: unknown) {
    return this.chamar(caminho, { metodo: 'POST', corpo });
  }

  async put(caminho: string, corpo?: unknown) {
    return this.chamar(caminho, { metodo: 'PUT', corpo });
  }

  async patch(caminho: string, corpo?: unknown) {
    return this.chamar(caminho, { metodo: 'PATCH', corpo });
  }

  private async chamar(caminho: string, opcoes: OpcoesPedido) {
    const token = await this.sessao.tokenAtual();
    const resposta = await enviar(this.enderecos.urlApi, caminho, opcoes, token, this.idioma);
    if (resposta.status !== 401) {
      return lerResposta(resposta);
    }
    const novo = await this.sessao.renovar(token);
    return lerResposta(await enviar(this.enderecos.urlApi, caminho, opcoes, novo, this.idioma));
  }
}

// Local use (Cursor, Claude Desktop over stdio): one account from the .env.
export class SessaoPorSenha implements Sessao {
  private tokens: TokensApi | null = null;

  constructor(
    private readonly urlApi: string,
    private readonly credenciais: { conta: string; email: string; senha: string },
  ) {}

  async tokenAtual() {
    if (!this.tokens) {
      await this.entrar();
    }
    return (this.tokens as TokensApi).accessToken;
  }

  async renovar() {
    if (this.tokens) {
      try {
        this.tokens = await renovarNaApi(this.urlApi, this.tokens.refreshToken);
        return this.tokens.accessToken;
      } catch {
        // The refresh token expired too: sign in again below.
      }
    }
    await this.entrar();
    return (this.tokens as TokensApi).accessToken;
  }

  private async entrar() {
    const { conta, email, senha } = this.credenciais;
    const resposta = await entrarNaApi(this.urlApi, conta, email, senha);
    this.tokens = resposta.tokens;
  }
}
