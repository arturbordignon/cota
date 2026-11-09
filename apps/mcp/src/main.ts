// eslint-disable-next-line import/no-unresolved
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { ClienteCota, SessaoPorSenha } from './cliente-api.js';
import { carregarConfiguracao } from './config.js';
import { criarServidor } from './servidor.js';

// Local use over stdio (Cursor, Claude Desktop): one account from the .env.
// The hosted server that customers connect to is http.ts.
async function iniciar() {
  const configuracao = carregarConfiguracao();
  const sessao = new SessaoPorSenha(configuracao.urlApi, {
    conta: configuracao.slugConta,
    email: configuracao.email,
    senha: configuracao.senha,
  });
  const api = new ClienteCota(sessao, configuracao);

  const servidor = criarServidor(api);
  await servidor.connect(new StdioServerTransport());
}

iniciar().catch((erro) => {
  let mensagem = String(erro);
  if (erro instanceof Error && erro.message) {
    mensagem = erro.message;
  }
  console.error(mensagem);
  process.exit(1);
});
