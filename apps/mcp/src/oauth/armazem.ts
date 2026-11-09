import { Redis } from 'ioredis';

// Where the hosted server keeps OAuth state: registered clients, sign-in
// requests, codes, tokens and each person's Cota session. Values are JSON.
export interface Armazem {
  definir(chave: string, valor: unknown, segundos?: number): Promise<void>;
  // Replaces the value and keeps the time it has left.
  atualizar(chave: string, valor: unknown): Promise<void>;
  ler<T>(chave: string): Promise<T | null>;
  // Reads and deletes in one step, so a one-time code can't be used twice.
  tomar<T>(chave: string): Promise<T | null>;
  apagar(chave: string): Promise<void>;
  // Shortens the time left to at most this many seconds.
  encurtar(chave: string, segundos: number): Promise<void>;
  // Sets the time left, longer or shorter.
  prolongar(chave: string, segundos: number): Promise<void>;
  fechar(): Promise<void>;
}

const PREFIXO = 'cota:mcp:';

export class ArmazemRedis implements Armazem {
  private readonly redis: Redis;

  constructor(opcoes: { host: string; porta: number; senha?: string }) {
    this.redis = new Redis({
      host: opcoes.host,
      port: opcoes.porta,
      password: opcoes.senha,
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }

  async definir(chave: string, valor: unknown, segundos?: number) {
    const texto = JSON.stringify(valor);
    if (segundos) {
      await this.redis.set(PREFIXO + chave, texto, 'EX', segundos);
      return;
    }
    await this.redis.set(PREFIXO + chave, texto);
  }

  async atualizar(chave: string, valor: unknown) {
    await this.redis.set(PREFIXO + chave, JSON.stringify(valor), 'KEEPTTL');
  }

  async ler<T>(chave: string) {
    const texto = await this.redis.get(PREFIXO + chave);
    return texto ? (JSON.parse(texto) as T) : null;
  }

  async tomar<T>(chave: string) {
    const texto = await this.redis.getdel(PREFIXO + chave);
    return texto ? (JSON.parse(texto) as T) : null;
  }

  async apagar(chave: string) {
    await this.redis.del(PREFIXO + chave);
  }

  async encurtar(chave: string, segundos: number) {
    const restante = await this.redis.ttl(PREFIXO + chave);
    if (restante === -2) {
      return;
    }
    if (restante === -1 || restante > segundos) {
      await this.redis.expire(PREFIXO + chave, segundos);
    }
  }

  async prolongar(chave: string, segundos: number) {
    await this.redis.expire(PREFIXO + chave, segundos);
  }

  async fechar() {
    await this.redis.quit();
  }
}

// One process, nothing survives a restart: for development and tests.
export class ArmazemMemoria implements Armazem {
  private readonly dados = new Map<string, { texto: string; expiraEm: number | null }>();

  private vivo(chave: string) {
    const registro = this.dados.get(chave);
    if (!registro) {
      return null;
    }
    if (registro.expiraEm !== null && registro.expiraEm <= Date.now()) {
      this.dados.delete(chave);
      return null;
    }
    return registro;
  }

  async definir(chave: string, valor: unknown, segundos?: number) {
    this.dados.set(chave, {
      texto: JSON.stringify(valor),
      expiraEm: segundos ? Date.now() + segundos * 1000 : null,
    });
  }

  async atualizar(chave: string, valor: unknown) {
    const registro = this.vivo(chave);
    this.dados.set(chave, { texto: JSON.stringify(valor), expiraEm: registro?.expiraEm ?? null });
  }

  async ler<T>(chave: string) {
    const registro = this.vivo(chave);
    return registro ? (JSON.parse(registro.texto) as T) : null;
  }

  async tomar<T>(chave: string) {
    const valor = await this.ler<T>(chave);
    this.dados.delete(chave);
    return valor;
  }

  async apagar(chave: string) {
    this.dados.delete(chave);
  }

  async encurtar(chave: string, segundos: number) {
    const registro = this.vivo(chave);
    if (!registro) {
      return;
    }
    const limite = Date.now() + segundos * 1000;
    if (registro.expiraEm === null || registro.expiraEm > limite) {
      registro.expiraEm = limite;
    }
  }

  async prolongar(chave: string, segundos: number) {
    const registro = this.vivo(chave);
    if (registro) {
      registro.expiraEm = Date.now() + segundos * 1000;
    }
  }

  async fechar() {
    this.dados.clear();
  }
}
