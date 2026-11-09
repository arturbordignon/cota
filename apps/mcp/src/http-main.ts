import { carregarConfiguracaoHttp } from './config.js';
import { criarAppHttp } from './http.js';
import { ArmazemMemoria, ArmazemRedis, type Armazem } from './oauth/armazem.js';

function iniciar() {
  const config = carregarConfiguracaoHttp();
  let armazem: Armazem;
  if (config.redis) {
    armazem = new ArmazemRedis(config.redis);
  } else {
    console.warn('REDIS_HOST não definido: conexões ficam só na memória e somem ao reiniciar.');
    armazem = new ArmazemMemoria();
  }

  const { app } = criarAppHttp(config, armazem);
  const servidor = app.listen(config.porta, config.host, () => {
    console.log(`MCP do Cota em ${config.urlPublica}/mcp (porta ${config.porta})`);
  });

  const encerrar = () => {
    servidor.close(() => {
      void armazem.fechar().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', encerrar);
  process.on('SIGINT', encerrar);
}

try {
  iniciar();
} catch (erro) {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
}
