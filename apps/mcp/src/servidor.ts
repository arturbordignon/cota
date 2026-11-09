// eslint-disable-next-line import/no-unresolved
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ClienteCota } from './cliente-api.js';
import { registrarFerramentas } from './ferramentas.js';

export const INSTRUCOES = [
  'Cota monta propostas de serviços pesados (guindaste, munck, remoção): mobilização + diária × dias, com link que o cliente abre e aceita.',
  'Responda no idioma do usuário. Frases curtas, sem jargão.',
  '',
  'Sempre comece com preparar_proposta.',
  '- Se plano.podeCriar for false: diga que o teste grátis ou o limite do mês acabou, mande plano.linkPlanos e pare.',
  '- Modo "guiado" (conta nova ou incompleta): antes da proposta, resolva passosQueFaltam na ordem.',
  '  Uma pergunta por mensagem. Salve cada resposta na hora (salvar_empresa, registrar_servico, salvar_padroes) para nunca perguntar de novo.',
  '  Se o usuário quiser pular a configuração, siga para a proposta e deixe os avisos lembrarem.',
  '- Modo "rapido": vá direto para a proposta.',
  '',
  'Para a proposta, pergunte só o que ainda não sabe, nesta ordem: cliente, local e período, escopo, equipamento, equipe, mobilização, diária e dias.',
  'Use o catálogo (diária de sempre) e os padrões da conta (condições, equipe, validade) sem perguntar de novo; confirme se valem para esta obra.',
  'Chame montar_proposta com apenasPrevia=true, mostre o resumo com o total e os avisos, e resolva os avisos importantes com o usuário.',
  'Só salve (montar_proposta sem apenasPrevia) depois de um "pode salvar". Cada proposta salva conta uma no plano.',
  'Correções numa proposta salva vão por editar_proposta, nunca montando outra.',
  'No fim, entregue o link público. Gere PDF ou marque como enviada só se o usuário pedir.',
].join('\n');

function promptNova(pedido?: string) {
  const linhas = ['Quero montar uma proposta no Cota.'];
  if (pedido?.trim()) {
    linhas.push(`O pedido: ${pedido.trim()}`);
  }
  linhas.push(
    '',
    'Comece com preparar_proposta. Se faltar configurar a conta, me pergunte uma coisa por vez e salve cada resposta.',
    'Depois, pergunte só o que faltar da proposta, mostre a prévia com o total e os avisos, e só salve quando eu disser que pode.',
  );
  return linhas.join('\n');
}

const PROMPT_CONFIGURAR = [
  'Quero deixar minha conta do Cota pronta para mandar propostas boas.',
  'Comece com preparar_proposta e me guie pelo que falta, uma pergunta por vez:',
  '1. dados da empresa que saem no PDF (nome, CNPJ, telefone, endereço);',
  '2. os equipamentos que mais alugo, com capacidade e diária;',
  '3. as condições comerciais de sempre e a equipe que costuma ir.',
  'Salve cada resposta assim que eu responder. No fim, me diga o que ficou pronto e o que só dá para fazer na tela (logo e modelo).',
].join('\n');

export function criarServidor(api: ClienteCota) {
  const servidor = new McpServer({ name: 'cota', version: '0.2.0', title: 'Cota' }, { instructions: INSTRUCOES });

  registrarFerramentas(servidor, api);

  servidor.registerPrompt(
    'nova_proposta',
    {
      title: 'Nova proposta',
      description: 'Monta uma proposta passo a passo, configurando a conta antes se for a primeira vez.',
      argsSchema: {
        pedido: z.string().optional().describe('O que você já sabe: cliente, equipamento, local, datas, valores'),
      },
    },
    ({ pedido }) => ({
      messages: [{ role: 'user', content: { type: 'text', text: promptNova(pedido) } }],
    }),
  );

  servidor.registerPrompt(
    'configurar_conta',
    {
      title: 'Configurar a conta',
      description: 'Deixa empresa, catálogo e condições padrão prontos, uma pergunta por vez.',
    },
    () => ({
      messages: [{ role: 'user', content: { type: 'text', text: PROMPT_CONFIGURAR } }],
    }),
  );

  return servidor;
}
