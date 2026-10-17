// eslint-disable-next-line import/no-unresolved
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/no-unresolved
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { ClienteCota } from './cliente-api.js';
import { carregarConfiguracao } from './config.js';
import { registrarFerramentas } from './ferramentas.js';

async function iniciar() {
  const configuracao = carregarConfiguracao();
  const api = new ClienteCota(configuracao);

  const servidor = new McpServer({
    name: 'cota',
    version: '0.1.0',
    title: 'Cota',
    description: [
      'Cota gera propostas de serviços pesados.',
      'O usuário descreve a operação. Você pergunta só o que falta e chama as ferramentas.',
      'Fluxo: listar_clientes, listar_servicos, listar_modelos, depois montar_proposta.',
      'Salve a proposta. Só gere PDF ou envie se o usuário pedir.',
    ].join(' '),
  });

  registrarFerramentas(servidor, api);

  const transporte = new StdioServerTransport();
  await servidor.connect(transporte);
}

iniciar().catch((erro) => {
  let mensagem = String(erro);
  if (erro instanceof Error && erro.message) {
    mensagem = erro.message;
  }
  console.error(mensagem);
  process.exit(1);
});
