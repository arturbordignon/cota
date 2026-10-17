import type { ConfiguracaoMcp } from './config.js';

export type OpcoesPedido = {
  metodo?: string;
  corpo?: unknown;
  query?: Record<string, string | undefined>;
};

type RespostaLogin = {
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
  message?: string;
};

export class ClienteCota {
  private configuracao: ConfiguracaoMcp;
  private tokenAcesso = '';
  private tokenRefresh = '';

  constructor(configuracao: ConfiguracaoMcp) {
    this.configuracao = configuracao;
  }

  urlWeb() {
    return this.configuracao.urlWeb;
  }

  async get(caminho: string, query?: Record<string, string | undefined>) {
    return this.chamar(caminho, { metodo: 'GET', query });
  }

  async post(caminho: string, corpo?: unknown) {
    return this.chamar(caminho, { metodo: 'POST', corpo });
  }

  async patch(caminho: string, corpo?: unknown) {
    return this.chamar(caminho, { metodo: 'PATCH', corpo });
  }

  private async chamar(caminho: string, opcoes: OpcoesPedido) {
    await this.garantirSessao();
    const resposta = await this.enviar(caminho, opcoes, this.tokenAcesso);
    if (resposta.status !== 401) {
      return this.lerResposta(resposta);
    }

    await this.renovar();
    const repetida = await this.enviar(caminho, opcoes, this.tokenAcesso);
    return this.lerResposta(repetida);
  }

  private async garantirSessao() {
    if (this.tokenAcesso) {
      return;
    }
    await this.entrar();
  }

  private async entrar() {
    const resposta = await this.enviar(
      '/auth/login',
      {
        metodo: 'POST',
        corpo: {
          accountSlug: this.configuracao.slugConta,
          email: this.configuracao.email,
          password: this.configuracao.senha,
        },
      },
      '',
    );
    const dados = (await this.lerResposta(resposta)) as RespostaLogin;
    this.guardarTokens(dados);
  }

  private async renovar() {
    if (!this.tokenRefresh) {
      await this.entrar();
      return;
    }

    const resposta = await this.enviar(
      '/auth/refresh',
      {
        metodo: 'POST',
        corpo: { refreshToken: this.tokenRefresh },
      },
      '',
    );
    if (resposta.status >= 400) {
      await this.entrar();
      return;
    }
    const dados = (await this.lerResposta(resposta)) as RespostaLogin;
    this.guardarTokens(dados);
  }

  private guardarTokens(dados: RespostaLogin) {
    if (!dados.tokens) {
      throw new Error('A API não devolveu tokens de sessão.');
    }
    if (!dados.tokens.accessToken) {
      throw new Error('A API não devolveu o token de acesso.');
    }
    this.tokenAcesso = dados.tokens.accessToken;
    if (dados.tokens.refreshToken) {
      this.tokenRefresh = dados.tokens.refreshToken;
    }
  }

  private async enviar(caminho: string, opcoes: OpcoesPedido, token: string) {
    const metodo = opcoes.metodo;
    let verbo = 'GET';
    if (metodo) {
      verbo = metodo;
    }

    const url = new URL(`${this.configuracao.urlApi}${caminho}`);
    if (opcoes.query) {
      for (const [chave, valor] of Object.entries(opcoes.query)) {
        if (!valor) {
          continue;
        }
        url.searchParams.set(chave, valor);
      }
    }

    const cabecalhos: Record<string, string> = {
      Accept: 'application/json',
      'Accept-Language': 'pt-BR',
    };
    if (token) {
      cabecalhos.Authorization = `Bearer ${token}`;
    }
    if (opcoes.corpo) {
      cabecalhos['Content-Type'] = 'application/json';
    }

    let corpo: string | undefined;
    if (opcoes.corpo) {
      corpo = JSON.stringify(opcoes.corpo);
    }

    return fetch(url, {
      method: verbo,
      headers: cabecalhos,
      body: corpo,
    });
  }

  private async lerResposta(resposta: Response) {
    const texto = await resposta.text();
    let dados: unknown = {};
    if (texto) {
      dados = JSON.parse(texto);
    }
    if (resposta.ok) {
      return dados;
    }

    let mensagem = `A API respondeu ${resposta.status}`;
    if (dados && typeof dados === 'object' && 'message' in dados) {
      const aviso = (dados as { message?: unknown }).message;
      if (typeof aviso === 'string' && aviso) {
        mensagem = aviso;
      }
    }
    throw new Error(mensagem);
  }
}
