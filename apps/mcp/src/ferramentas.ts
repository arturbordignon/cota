// eslint-disable-next-line import/no-unresolved
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { ErroApi, type ClienteCota } from './cliente-api.js';
import { avaliarConta } from './preparo.js';
import {
  aplicarMudancas,
  aplicarPadroes,
  calcularTotal,
  casarClientePorNome,
  casarServicosPorNome,
  escolherModelo,
  linkPublico,
  montarDataExpiracao,
  montarPayloadProposta,
  montarTotais,
  paraIdioma,
  revisarProposta,
  separarLinhas,
  type ClienteResumo,
  type DadosMontagem,
  type Empresa,
  type ModeloResumo,
  type PadroesProposta,
  type PayloadProposta,
  type ServicoResumo,
  type Totais,
} from './proposta.js';

type Envelope<T> = { data?: T };
type Registro = Record<string, unknown>;

const SO_LEITURA = { readOnlyHint: true, openWorldHint: false } as const;
const CRIA = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;
const ALTERA = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false } as const;

function responder(dados: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 2) }],
  };
}

// Turns API failures into what the person should do next.
export function explicarErro(erro: unknown) {
  if (erro instanceof ErroApi) {
    if (erro.codigo === 'TRIAL_ENDED' || erro.codigo === 'PROPOSAL_LIMIT_REACHED') {
      const link = erro.linkPlanos ? ` Planos: ${erro.linkPlanos}` : '';
      return `${erro.message}${link}`;
    }
    if (erro.status === 403) {
      return 'Sem permissão para isso na sua conta do Cota. Peça a quem administra a conta.';
    }
    if (erro.status === 404) {
      return `Não encontrado no Cota: ${erro.message}`;
    }
    return erro.message;
  }
  if (erro instanceof Error && erro.message) {
    return erro.message;
  }
  return 'Falha ao falar com a API do Cota.';
}

function responderErro(erro: unknown) {
  return {
    content: [{ type: 'text' as const, text: explicarErro(erro) }],
    isError: true,
  };
}

function lista<T>(resposta: unknown) {
  return ((resposta as Envelope<T[]>)?.data ?? []) as T[];
}

function item<T>(resposta: unknown) {
  return (resposta as Envelope<T>)?.data;
}

// A part of the account the person may not see (e.g. the catalog for a
// salesperson without access) shouldn't stop the proposal.
async function talvez<T>(promessa: Promise<T>) {
  try {
    return await promessa;
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 403) {
      return null;
    }
    throw erro;
  }
}

function resumoCliente(cliente: Registro) {
  return {
    id: cliente.id,
    nome: cliente.name,
    empresa: cliente.companyName,
    email: cliente.email,
    telefone: cliente.phone,
    notas: cliente.notes,
  };
}

function resumoServico(servico: Registro) {
  return {
    id: servico.id,
    nome: servico.name,
    capacidadeToneladas: servico.capacityTons,
    diaria: servico.dailyRate,
    especificacoes: servico.specsJson,
  };
}

function resumoModelo(modelo: Registro) {
  return {
    id: modelo.id,
    nome: modelo.name,
    descricao: modelo.description,
    idioma: modelo.locale,
    daConta: Boolean(modelo.accountId),
    ativo: modelo.isActive,
  };
}

function resumoProposta(proposta: Registro) {
  const cliente = proposta.client as Registro | null | undefined;
  const modelo = proposta.template as Registro | null | undefined;
  return {
    id: proposta.id,
    titulo: proposta.title,
    status: proposta.status,
    slug: proposta.publicSlug,
    totais: proposta.totalsJson,
    idCliente: proposta.clientId,
    cliente: cliente?.name ?? null,
    modelo: modelo?.name ?? null,
    criadaEm: proposta.createdAt,
    expiraEm: proposta.expiresAt,
  };
}

// What the person reads back before saying "pode salvar".
function resumoParaConferir(payload: PayloadProposta, totais: Totais, cliente: string | null, moeda: string) {
  return {
    cliente,
    titulo: payload.job.projectName,
    local: payload.job.siteLocation,
    periodo: payload.job.schedule,
    escopo: payload.job.scope,
    equipamentos: payload.equipment.map((equipamento) => equipamento.name),
    equipe: payload.team,
    condicoes: payload.terms,
    validade: payload.pricing.validity,
    moeda,
    mobilizacao: totais.mobilization,
    diaria: totais.dailyRate,
    dias: totais.days,
    total: calcularTotal(totais),
  };
}

function filtrarClientes(clientes: Registro[], busca?: string) {
  if (!busca) {
    return clientes;
  }
  const termo = busca.toLowerCase();
  return clientes.filter((cliente) =>
    [cliente.name, cliente.companyName, cliente.email].some((valor) =>
      String(valor || '').toLowerCase().includes(termo),
    ),
  );
}

type Contexto = {
  sessao: {
    user?: { name?: string; role?: string };
    account?: { name?: string; locale?: string };
    permissions?: Record<string, { view: boolean; edit: boolean }>;
  };
  empresa: Empresa | null;
  modelos: ModeloResumo[];
  catalogo: ServicoResumo[] | null;
  clientes: ClienteResumo[] | null;
  padroes: PadroesProposta | null;
  cobranca: Registro | null;
};

// Everything a proposal depends on, read in one go.
async function carregarContexto(api: ClienteCota): Promise<Contexto> {
  const [sessao, conta, modelos, catalogo, clientes, padroes, cobranca] = await Promise.all([
    api.get('/auth/me'),
    api.get('/account'),
    talvez(api.get('/templates')),
    talvez(api.get('/equipment')),
    talvez(api.get('/clients')),
    talvez(api.get('/account/proposal-defaults')),
    talvez(api.get('/billing/overview')),
  ]);
  return {
    sessao: sessao as Contexto['sessao'],
    empresa: item<{ company?: Empresa }>(conta)?.company ?? null,
    modelos: modelos ? lista<ModeloResumo>(modelos) : [],
    catalogo: catalogo ? lista<ServicoResumo>(catalogo) : null,
    clientes: clientes ? lista<ClienteResumo>(clientes) : null,
    padroes: padroes ? item<PadroesProposta>(padroes) ?? null : null,
    cobranca: cobranca ? item<Registro>(cobranca) ?? null : null,
  };
}

function moedaDa(contexto: Contexto) {
  const plano = contexto.cobranca?.plan as { currency?: string } | null | undefined;
  return plano?.currency ?? (contexto.sessao.account?.locale === 'en' ? 'USD' : 'BRL');
}

const camposDaProposta = {
  titulo: z.string().optional().describe('Nome do projeto ou da operação'),
  localOperacao: z.string().optional().describe('Cidade/UF e local da obra'),
  dataInicio: z.string().optional().describe('YYYY-MM-DD'),
  dataFim: z.string().optional().describe('YYYY-MM-DD'),
  escopo: z.string().optional().describe('Uma linha por item do escopo'),
  idsServicos: z.array(z.string()).optional().describe('UUIDs de equipamentos do catálogo'),
  servicosExtras: z
    .string()
    .optional()
    .describe('Equipamentos por nome, um por linha. Os que existirem no catálogo são usados de lá'),
  equipe: z.string().optional().describe('Uma linha por pessoa ou função. Vazio usa a equipe padrão da conta'),
  condicoes: z.string().optional().describe('Uma linha por condição comercial. Vazio usa as condições padrão da conta'),
  mobilizacao: z.number().optional().describe('Valor da mobilização, na moeda da conta'),
  diaria: z.number().optional().describe('Valor da diária, na moeda da conta'),
  dias: z.number().optional().describe('Quantidade de diárias. Se vazio, conta pelas datas'),
  validadeDias: z.number().optional().describe('Validade em dias. Vazio usa o padrão da conta (ou 15)'),
};

export function registrarFerramentas(servidor: McpServer, api: ClienteCota) {
  servidor.registerTool(
    'preparar_proposta',
    {
      title: 'Preparar proposta',
      description: [
        'Chame primeiro, no começo de toda conversa sobre proposta.',
        'Diz se a conta está pronta (modo "rapido") ou se falta configurar algo (modo "guiado"),',
        'quantas propostas o plano ainda permite e as condições e equipe padrão já salvas.',
        'No modo guiado, siga passosQueFaltam na ordem, uma pergunta por vez, salvando cada resposta.',
        'Se plano.podeCriar for false, avise e mande o link de planos antes de qualquer pergunta.',
      ].join(' '),
      annotations: SO_LEITURA,
    },
    async () => {
      try {
        const contexto = await carregarContexto(api);
        return responder(
          avaliarConta({
            usuario: {
              nome: contexto.sessao.user?.name ?? '',
              papel: contexto.sessao.user?.role ?? '',
              permissoes: contexto.sessao.permissions,
            },
            conta: { nome: contexto.sessao.account?.name ?? '', idioma: contexto.sessao.account?.locale ?? 'pt-BR' },
            empresa: contexto.empresa,
            modelos: contexto.modelos,
            catalogo: contexto.catalogo,
            padroes: contexto.padroes,
            cobranca: contexto.cobranca as Parameters<typeof avaliarConta>[0]['cobranca'],
            urlWeb: api.urlWeb(),
          }),
        );
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'ver_conta',
    {
      title: 'Ver conta',
      description: 'Mostra a conta, o usuário logado e os dados da empresa no Cota.',
      annotations: SO_LEITURA,
    },
    async () => {
      try {
        const sessao = await api.get('/auth/me');
        const conta = await api.get('/account');
        return responder({ sessao, conta: item(conta) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'salvar_empresa',
    {
      title: 'Salvar dados da empresa',
      description:
        'Salva os dados da empresa que saem no cabeçalho e rodapé de toda proposta. Só o dono da conta pode. Mande só o que mudou; o resto fica.',
      inputSchema: {
        nome: z.string().optional().describe('Razão social ou nome fantasia'),
        cnpj: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        endereco: z.string().optional(),
        slogan: z.string().optional(),
      },
      annotations: ALTERA,
    },
    async (entrada) => {
      try {
        const atual = item<{ company?: Empresa & { tagline?: string } }>(await api.get('/account'))?.company ?? {};
        const empresa = {
          name: entrada.nome ?? atual.name ?? '',
          cnpj: entrada.cnpj ?? atual.cnpj ?? '',
          phone: entrada.telefone ?? atual.phone ?? '',
          email: entrada.email ?? atual.email ?? '',
          address: entrada.endereco ?? atual.address ?? '',
          tagline: entrada.slogan ?? atual.tagline ?? '',
        };
        if (!empresa.name.trim()) {
          return responderErro(new Error('Informe o nome da empresa.'));
        }
        const salvo = await api.put('/account/company', empresa);
        return responder({ empresa: item(salvo) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'salvar_padroes',
    {
      title: 'Salvar padrões das propostas',
      description:
        'Salva as condições comerciais, a equipe e a validade que toda proposta nova já traz. Uma lista enviada substitui a anterior; o que não for enviado fica.',
      inputSchema: {
        condicoes: z.string().optional().describe('Uma linha por condição: pagamento, o que está incluso, horas, hora extra'),
        equipe: z.string().optional().describe('Uma linha por pessoa ou função'),
        validadeDias: z.number().int().min(1).max(365).optional(),
      },
      annotations: ALTERA,
    },
    async (entrada) => {
      try {
        const atual = item<PadroesProposta>(await api.get('/account/proposal-defaults')) ?? {
          terms: [],
          team: [],
          validityDays: null,
        };
        const padroes: PadroesProposta = {
          terms: entrada.condicoes !== undefined ? separarLinhas(entrada.condicoes) : atual.terms,
          team: entrada.equipe !== undefined ? separarLinhas(entrada.equipe) : atual.team,
          validityDays: entrada.validadeDias ?? atual.validityDays,
        };
        const salvo = await api.put('/account/proposal-defaults', padroes);
        return responder({ padroes: item(salvo) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'listar_clientes',
    {
      title: 'Listar clientes',
      description: 'Lista os clientes da conta. Use para achar um idCliente antes de montar a proposta.',
      inputSchema: {
        busca: z.string().optional().describe('Filtra por nome, empresa ou e-mail'),
      },
      annotations: SO_LEITURA,
    },
    async ({ busca }) => {
      try {
        const clientes = filtrarClientes(lista<Registro>(await api.get('/clients')), busca).map(resumoCliente);
        return responder({ clientes });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'ver_cliente',
    {
      title: 'Ver cliente',
      description: 'Mostra um cliente pelo id.',
      inputSchema: {
        idCliente: z.string().describe('UUID do cliente'),
      },
      annotations: SO_LEITURA,
    },
    async ({ idCliente }) => {
      try {
        const cliente = item<Registro>(await api.get(`/clients/${idCliente}`));
        if (!cliente) {
          return responderErro(new Error('Cliente não encontrado.'));
        }
        return responder({ cliente: resumoCliente(cliente) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'registrar_cliente',
    {
      title: 'Registrar cliente',
      description: 'Cadastra um cliente novo na conta. Peça telefone ou e-mail: o cliente recebe o link por eles.',
      inputSchema: {
        nome: z.string().min(1).describe('Nome da pessoa de contato'),
        empresa: z.string().optional().describe('Razão social ou nome fantasia'),
        email: z.string().optional(),
        telefone: z.string().optional(),
        notas: z.string().optional(),
      },
      annotations: CRIA,
    },
    async ({ nome, empresa, email, telefone, notas }) => {
      try {
        const cliente = item<Registro>(
          await api.post('/clients', { name: nome, companyName: empresa, email, phone: telefone, notes: notas }),
        );
        if (!cliente) {
          return responderErro(new Error('Não foi possível cadastrar o cliente.'));
        }
        return responder({ cliente: resumoCliente(cliente) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'listar_servicos',
    {
      title: 'Listar serviços',
      description: 'Lista o catálogo de serviços e equipamentos da conta (guindaste, munck, diária).',
      annotations: SO_LEITURA,
    },
    async () => {
      try {
        return responder({ servicos: lista<Registro>(await api.get('/equipment')).map(resumoServico) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'registrar_servico',
    {
      title: 'Registrar equipamento',
      description:
        'Cadastra um equipamento ou serviço no catálogo, com a diária de sempre, para não precisar dizer de novo nas próximas propostas. Se já existir um com o mesmo nome, devolve o existente.',
      inputSchema: {
        nome: z.string().min(2).describe('Ex.: Guindaste todo-terreno 90 t'),
        capacidadeToneladas: z.number().nonnegative().optional(),
        diaria: z.number().nonnegative().optional().describe('Diária na moeda da conta'),
        descricao: z.string().optional().describe('Alcance, lança, modelo'),
        observacoes: z.string().optional().describe('Certificações, o que acompanha'),
      },
      annotations: CRIA,
    },
    async (entrada) => {
      try {
        const catalogo = lista<ServicoResumo>(await api.get('/equipment'));
        const casado = casarServicosPorNome([entrada.nome], catalogo);
        if (casado.ids.length) {
          const existente = catalogo.find((servico) => servico.id === casado.ids[0]) as Registro | undefined;
          return responder({ jaExistia: true, servico: existente ? resumoServico(existente) : null });
        }
        const criado = item<Registro>(
          await api.post('/equipment', {
            name: entrada.nome,
            capacityTons: entrada.capacidadeToneladas,
            dailyRate: entrada.diaria,
            description: entrada.descricao,
            notes: entrada.observacoes,
          }),
        );
        return responder({ jaExistia: false, servico: criado ? resumoServico(criado) : null });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'listar_modelos',
    {
      title: 'Listar modelos',
      description: 'Lista os modelos de proposta. Prefira um modelo da conta; se não houver, use o padrão do Cota.',
      annotations: SO_LEITURA,
    },
    async () => {
      try {
        return responder({ modelos: lista<Registro>(await api.get('/templates')).map(resumoModelo) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'listar_propostas',
    {
      title: 'Listar propostas',
      description: 'Lista as propostas da conta, da mais recente para a mais antiga.',
      inputSchema: {
        status: z.enum(['DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
        idCliente: z.string().optional(),
      },
      annotations: SO_LEITURA,
    },
    async ({ status, idCliente }) => {
      try {
        const propostas = lista<Registro>(await api.get('/proposals', { status, clientId: idCliente }));
        return responder({ propostas: propostas.map(resumoProposta) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'ver_proposta',
    {
      title: 'Ver proposta',
      description: 'Mostra uma proposta pelo id ou pelo slug público, com o link que o cliente abre.',
      inputSchema: {
        idOuSlug: z.string().describe('UUID da proposta ou publicSlug'),
      },
      annotations: SO_LEITURA,
    },
    async ({ idOuSlug }) => {
      try {
        const proposta = item<Registro>(await api.get(`/proposals/${idOuSlug}`));
        if (!proposta) {
          return responderErro(new Error('Proposta não encontrada.'));
        }
        return responder({
          proposta: resumoProposta(proposta),
          payload: proposta.payloadJson,
          totais: proposta.totalsJson,
          linkPublico: linkPublico(api.urlWeb(), String(proposta.publicSlug || '')),
        });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'montar_proposta',
    {
      title: 'Montar proposta',
      description: [
        'Monta a proposta a partir do que o usuário descreveu.',
        'Primeiro chame com apenasPrevia=true: nada é salvo, e volta o resumo, o total e os avisos do que falta.',
        'Mostre o resumo, resolva os avisos com o usuário e só chame de novo sem apenasPrevia quando ele confirmar.',
        'Cada proposta salva conta uma no plano do mês; para corrigir uma já salva, use editar_proposta.',
        'Condições, equipe e validade vazias vêm dos padrões da conta. Cliente novo é cadastrado por nomeCliente.',
        'Salva como rascunho. Gerar PDF e enviar só se o usuário pedir.',
      ].join(' '),
      inputSchema: {
        apenasPrevia: z.boolean().optional().describe('true monta e confere sem salvar nada'),
        idCliente: z.string().optional().describe('UUID de um cliente já cadastrado'),
        nomeCliente: z.string().optional().describe('Se não houver id, busca por nome ou empresa, ou cadastra'),
        empresaCliente: z.string().optional(),
        emailCliente: z.string().optional(),
        telefoneCliente: z.string().optional(),
        ...camposDaProposta,
        idModelo: z.string().optional().describe('UUID do modelo. Vazio usa o modelo da conta ou o padrão'),
        gerarPdf: z.boolean().optional(),
        enviar: z.boolean().optional(),
      },
      annotations: CRIA,
    },
    async (entrada) => {
      try {
        return responder(await montarProposta(api, entrada));
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'editar_proposta',
    {
      title: 'Editar proposta',
      description: [
        'Corrige uma proposta já salva sem criar outra (não conta no plano).',
        'Mande só o que mudou. Listas (escopo, equipe, condições, equipamentos) substituem as anteriores.',
        'Para mudar o período mande dataInicio e dataFim. Propostas aceitas ou recusadas não mudam.',
      ].join(' '),
      inputSchema: {
        idProposta: z.string().describe('UUID ou slug da proposta'),
        idCliente: z.string().optional().describe('Troca o cliente por outro já cadastrado'),
        ...camposDaProposta,
      },
      annotations: ALTERA,
    },
    async (entrada) => {
      try {
        return responder(await editarProposta(api, entrada));
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'revisar_proposta',
    {
      title: 'Revisar proposta',
      description:
        'Confere uma proposta salva e lista o que falta para ela sair completa (escopo, condições, contato do cliente, dados da empresa). Use antes de enviar.',
      inputSchema: {
        idProposta: z.string().describe('UUID ou slug da proposta'),
      },
      annotations: SO_LEITURA,
    },
    async ({ idProposta }) => {
      try {
        const [contexto, bruta] = await Promise.all([carregarContexto(api), api.get(`/proposals/${idProposta}`)]);
        const proposta = item<Registro>(bruta);
        if (!proposta) {
          return responderErro(new Error('Proposta não encontrada.'));
        }
        const modelo = proposta.template as ModeloResumo | null;
        return responder({
          proposta: resumoProposta(proposta),
          avisos: revisarProposta(
            {
              payload: proposta.payloadJson,
              totais: proposta.totalsJson,
              cliente: (proposta.client as ClienteResumo | null) ?? null,
              empresa: contexto.empresa,
              modeloDaConta: Boolean(modelo?.accountId),
              catalogo: contexto.catalogo ?? [],
            },
            paraIdioma(String(proposta.locale ?? modelo?.locale ?? '')),
          ),
          linkPublico: linkPublico(api.urlWeb(), String(proposta.publicSlug || '')),
        });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'gerar_pdf',
    {
      title: 'Gerar PDF',
      description: 'Enfileira a geração do PDF da proposta. Gere de novo depois de editar.',
      inputSchema: {
        idProposta: z.string().describe('UUID ou slug da proposta'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ idProposta }) => {
      try {
        return responder(await api.post(`/proposals/${idProposta}/generate`));
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'enviar_proposta',
    {
      title: 'Enviar proposta',
      description:
        'Marca a proposta como enviada: o link público passa a abrir para o cliente. O Cota não manda mensagem; quem manda o link é o usuário.',
      inputSchema: {
        idProposta: z.string().describe('UUID ou slug da proposta'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ idProposta }) => {
      try {
        const dados = item<Registro>(await api.post(`/proposals/${idProposta}/send`));
        let slug = String(dados?.publicSlug ?? '');
        if (!slug) {
          const proposta = item<Registro>(await api.get(`/proposals/${idProposta}`));
          slug = String(proposta?.publicSlug ?? '');
        }
        return responder({ proposta: dados, linkPublico: linkPublico(api.urlWeb(), slug) });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );
}

type EntradaMontagem = DadosMontagem & { apenasPrevia?: boolean };

export async function montarProposta(api: ClienteCota, entrada: EntradaMontagem) {
  const contexto = await carregarContexto(api);
  const catalogo = contexto.catalogo ?? [];
  const modelo = escolherModelo(contexto.modelos, entrada.idModelo, contexto.sessao.account?.locale);
  if (!modelo) {
    throw new Error('Nenhum modelo de proposta disponível.');
  }
  // The proposal is written in the template's language, like the web wizard.
  const idioma = paraIdioma(modelo.locale);

  let cliente: ClienteResumo | undefined;
  let clienteNovo = false;
  if (entrada.idCliente) {
    cliente = contexto.clientes?.find((registro) => registro.id === entrada.idCliente);
    if (!cliente && contexto.clientes) {
      throw new Error('Cliente não encontrado. Use listar_clientes ou informe nomeCliente.');
    }
  } else if (entrada.nomeCliente) {
    cliente = casarClientePorNome(entrada.nomeCliente, contexto.clientes ?? []);
    clienteNovo = !cliente;
  }

  const { dados, preenchidosPelosPadroes } = aplicarPadroes(entrada, contexto.padroes, modelo);
  const casados = casarServicosPorNome(separarLinhas(dados.servicosExtras), catalogo);
  const montagem: DadosMontagem = {
    ...dados,
    idsServicos: [...(dados.idsServicos ?? []), ...casados.ids],
    servicosExtras: casados.extras.join('\n'),
  };

  const totais = montarTotais(montagem);
  const payload = montarPayloadProposta(montagem, catalogo, idioma);
  const nomeCliente = cliente?.name ?? entrada.nomeCliente ?? null;
  const avisos = revisarProposta(
    {
      payload,
      totais,
      cliente: cliente ?? (clienteNovo ? { email: entrada.emailCliente, phone: entrada.telefoneCliente } : null),
      empresa: contexto.empresa,
      modeloDaConta: Boolean(modelo.accountId),
      catalogo,
    },
    idioma,
  );
  const resumo = resumoParaConferir(payload, totais, nomeCliente, moedaDa(contexto));

  if (entrada.apenasPrevia) {
    return {
      previa: true,
      salva: false,
      resumo,
      avisos,
      modelo: modelo.name,
      clienteNovo,
      preenchidosPelosPadroes,
      equipamentosForaDoCatalogo: casados.extras,
      proximoPasso: 'Mostre o resumo e os avisos. Salve chamando montar_proposta sem apenasPrevia só depois do "pode salvar".',
    };
  }

  let idCliente = cliente?.id ?? entrada.idCliente;
  if (!idCliente && entrada.nomeCliente) {
    const criado = item<ClienteResumo>(
      await api.post('/clients', {
        name: entrada.nomeCliente,
        companyName: entrada.empresaCliente,
        email: entrada.emailCliente,
        phone: entrada.telefoneCliente,
      }),
    );
    if (!criado) {
      throw new Error('Não foi possível cadastrar o cliente.');
    }
    idCliente = criado.id;
  }

  const corpo: Registro = {
    templateId: modelo.id,
    title: dados.titulo?.trim() || modelo.name,
    payload,
    totals: totais,
  };
  if (idCliente) {
    corpo.clientId = idCliente;
  }
  const expiresAt = montarDataExpiracao(dados.validadeDias ?? 0);
  if (expiresAt) {
    corpo.expiresAt = expiresAt;
  }

  const proposta = item<Registro>(await api.post('/proposals', corpo));
  if (!proposta) {
    throw new Error('Não foi possível salvar a proposta.');
  }
  const idProposta = String(proposta.id);

  if (entrada.gerarPdf) {
    await api.post(`/proposals/${idProposta}/generate`);
  }
  if (entrada.enviar) {
    await api.post(`/proposals/${idProposta}/send`);
  }

  return {
    salva: true,
    proposta: resumoProposta(proposta),
    resumo,
    avisos,
    modelo: modelo.name,
    clienteNovo,
    preenchidosPelosPadroes,
    linkPublico: linkPublico(api.urlWeb(), String(proposta.publicSlug || '')),
    pdfEnfileirado: Boolean(entrada.gerarPdf),
    enviada: Boolean(entrada.enviar),
  };
}

type EntradaEdicao = Omit<DadosMontagem, 'nomeCliente' | 'empresaCliente' | 'emailCliente' | 'telefoneCliente' | 'idModelo' | 'gerarPdf' | 'enviar'> & {
  idProposta: string;
};

export async function editarProposta(api: ClienteCota, entrada: EntradaEdicao) {
  const { idProposta, idCliente, ...mudancas } = entrada;
  const [contexto, bruta] = await Promise.all([carregarContexto(api), api.get(`/proposals/${idProposta}`)]);
  const proposta = item<Registro>(bruta);
  if (!proposta) {
    throw new Error('Proposta não encontrada.');
  }
  const status = String(proposta.status);
  if (status === 'ACCEPTED' || status === 'DECLINED') {
    throw new Error('O cliente já respondeu esta proposta, então ela não muda. Para outro valor, monte uma proposta nova.');
  }

  const modelo = proposta.template as ModeloResumo | null;
  const idioma = paraIdioma(String(proposta.locale ?? modelo?.locale ?? ''));
  const catalogo = contexto.catalogo ?? [];
  const { payload, totais, alterados } = aplicarMudancas(proposta.payloadJson, proposta.totalsJson, mudancas, catalogo, idioma);

  let cliente = (proposta.client as ClienteResumo | null) ?? null;
  const corpo: Registro = { payload, totals: totais };
  if (mudancas.titulo?.trim()) {
    corpo.title = mudancas.titulo.trim();
  }
  if (mudancas.validadeDias) {
    corpo.expiresAt = montarDataExpiracao(mudancas.validadeDias);
  }
  if (idCliente) {
    corpo.clientId = idCliente;
    cliente = contexto.clientes?.find((registro) => registro.id === idCliente) ?? cliente;
    alterados.push('cliente');
  }
  if (!alterados.length) {
    throw new Error('Nada para mudar: informe os campos novos.');
  }

  const salva = item<Registro>(await api.patch(`/proposals/${proposta.id}`, corpo)) ?? proposta;
  const avisos = revisarProposta(
    { payload, totais, cliente, empresa: contexto.empresa, modeloDaConta: Boolean(modelo?.accountId), catalogo },
    idioma,
  );

  const observacoes: string[] = [];
  if (proposta.pdfObjectKey) {
    observacoes.push('O PDF que já existia é da versão anterior. Gere de novo com gerar_pdf.');
  }
  if (status === 'SENT' || status === 'PENDING') {
    observacoes.push('O cliente já tem o link e verá a versão nova quando abrir.');
  }

  return {
    proposta: resumoProposta(salva),
    alterados,
    resumo: resumoParaConferir(payload, totais, cliente?.name ?? null, moedaDa(contexto)),
    avisos,
    observacoes,
    linkPublico: linkPublico(api.urlWeb(), String(salva.publicSlug || proposta.publicSlug || '')),
  };
}
