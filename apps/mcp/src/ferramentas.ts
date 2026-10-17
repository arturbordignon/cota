// eslint-disable-next-line import/no-unresolved
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import type { ClienteCota } from './cliente-api.js';
import {
  casarClientePorNome,
  casarServicosPorNome,
  escolherModelo,
  linkPublico,
  montarDataExpiracao,
  montarPayloadProposta,
  montarTotais,
  separarLinhas,
  type ClienteResumo,
  type DadosMontagem,
  type ModeloResumo,
  type ServicoResumo,
} from './proposta.js';

type Envelope<T> = { data?: T };

function responder(dados: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(dados, null, 2) }],
  };
}

function responderErro(erro: unknown) {
  let mensagem = 'Falha ao falar com a API do Cota.';
  if (erro instanceof Error && erro.message) {
    mensagem = erro.message;
  }
  return {
    content: [{ type: 'text' as const, text: mensagem }],
    isError: true,
  };
}

function lista<T>(resposta: Envelope<T[]>) {
  if (!resposta.data) {
    return [] as T[];
  }
  return resposta.data;
}

function item<T>(resposta: Envelope<T>) {
  return resposta.data;
}

function resumoCliente(cliente: Record<string, unknown>) {
  return {
    id: cliente.id,
    nome: cliente.name,
    empresa: cliente.companyName,
    email: cliente.email,
    telefone: cliente.phone,
    notas: cliente.notes,
  };
}

function resumoServico(servico: Record<string, unknown>) {
  return {
    id: servico.id,
    nome: servico.name,
    capacidadeToneladas: servico.capacityTons,
    diaria: servico.dailyRate,
    especificacoes: servico.specsJson,
  };
}

function resumoModelo(modelo: Record<string, unknown>) {
  return {
    id: modelo.id,
    nome: modelo.name,
    descricao: modelo.description,
    idioma: modelo.locale,
    categoria: modelo.category,
    daConta: Boolean(modelo.accountId),
    ativo: modelo.isActive,
    campos: modelo.inputSchemaJson,
  };
}

function resumoProposta(proposta: Record<string, unknown>) {
  const cliente = proposta.client as Record<string, unknown> | null | undefined;
  const modelo = proposta.template as Record<string, unknown> | null | undefined;
  let nomeCliente = null;
  if (cliente) {
    nomeCliente = cliente.name;
  }
  let nomeModelo = null;
  if (modelo) {
    nomeModelo = modelo.name;
  }
  return {
    id: proposta.id,
    titulo: proposta.title,
    status: proposta.status,
    slug: proposta.publicSlug,
    totais: proposta.totalsJson,
    idCliente: proposta.clientId,
    cliente: nomeCliente,
    modelo: nomeModelo,
    criadaEm: proposta.createdAt,
  };
}

function filtrarClientes(clientes: Record<string, unknown>[], busca?: string) {
  if (!busca) {
    return clientes;
  }
  const termo = busca.toLowerCase();
  return clientes.filter((cliente) => {
    const nome = String(cliente.name || '').toLowerCase();
    const empresa = String(cliente.companyName || '').toLowerCase();
    const email = String(cliente.email || '').toLowerCase();
    if (nome.includes(termo)) {
      return true;
    }
    if (empresa.includes(termo)) {
      return true;
    }
    if (email.includes(termo)) {
      return true;
    }
    return false;
  });
}

export function registrarFerramentas(servidor: McpServer, api: ClienteCota) {
  servidor.registerTool(
    'ver_conta',
    {
      title: 'Ver conta',
      description: 'Mostra a conta e o usuário logados no Cota.',
    },
    async () => {
      try {
        const sessao = await api.get('/auth/me');
        const conta = await api.get('/account');
        return responder({ sessao, conta: item(conta as Envelope<unknown>) });
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
    },
    async ({ busca }) => {
      try {
        const resposta = (await api.get('/clients')) as Envelope<Record<string, unknown>[]>;
        const clientes = filtrarClientes(lista(resposta), busca).map(resumoCliente);
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
    },
    async ({ idCliente }) => {
      try {
        const resposta = (await api.get(`/clients/${idCliente}`)) as Envelope<Record<string, unknown>>;
        const cliente = item(resposta);
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
      description: 'Cadastra um cliente novo na conta.',
      inputSchema: {
        nome: z.string().min(1).describe('Nome da pessoa de contato'),
        empresa: z.string().optional().describe('Razão social ou nome fantasia'),
        email: z.string().optional(),
        telefone: z.string().optional(),
        notas: z.string().optional(),
      },
    },
    async ({ nome, empresa, email, telefone, notas }) => {
      try {
        const resposta = (await api.post('/clients', {
          name: nome,
          companyName: empresa,
          email,
          phone: telefone,
          notes: notas,
        })) as Envelope<Record<string, unknown>>;
        const cliente = item(resposta);
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
    },
    async () => {
      try {
        const resposta = (await api.get('/equipment')) as Envelope<Record<string, unknown>[]>;
        return responder({ servicos: lista(resposta).map(resumoServico) });
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
    },
    async () => {
      try {
        const resposta = (await api.get('/templates')) as Envelope<Record<string, unknown>[]>;
        return responder({ modelos: lista(resposta).map(resumoModelo) });
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
    },
    async ({ status, idCliente }) => {
      try {
        const resposta = (await api.get('/proposals', {
          status,
          clientId: idCliente,
        })) as Envelope<Record<string, unknown>[]>;
        return responder({ propostas: lista(resposta).map(resumoProposta) });
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
    },
    async ({ idOuSlug }) => {
      try {
        const resposta = (await api.get(`/proposals/${idOuSlug}`)) as Envelope<Record<string, unknown>>;
        const proposta = item(resposta);
        if (!proposta) {
          return responderErro(new Error('Proposta não encontrada.'));
        }
        const slug = String(proposta.publicSlug || '');
        return responder({
          proposta: resumoProposta(proposta),
          payload: proposta.payloadJson,
          totais: proposta.totalsJson,
          linkPublico: linkPublico(api.urlWeb(), slug),
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
        'Monta e salva uma proposta a partir do que o usuário descreveu.',
        'Antes de chamar, liste clientes, serviços e modelos quando faltar id.',
        'Se o cliente não existir, informe nomeCliente que o MCP cadastra.',
        'O usuário só precisa falar: cliente, serviço, local, período, valores e escopo.',
        'Salva como rascunho. Use gerarPdf e enviar só se o usuário pedir.',
      ].join(' '),
      inputSchema: {
        idCliente: z.string().optional().describe('UUID de um cliente já cadastrado'),
        nomeCliente: z.string().optional().describe('Se não houver id, busca ou cadastra por este nome'),
        empresaCliente: z.string().optional(),
        emailCliente: z.string().optional(),
        telefoneCliente: z.string().optional(),
        titulo: z.string().optional().describe('Nome do projeto ou da operação'),
        localOperacao: z.string().optional(),
        dataInicio: z.string().optional().describe('YYYY-MM-DD'),
        dataFim: z.string().optional().describe('YYYY-MM-DD'),
        escopo: z.string().optional().describe('Uma linha por item do escopo'),
        idsServicos: z.array(z.string()).optional().describe('UUIDs do catálogo'),
        servicosExtras: z.string().optional().describe('Equipamentos fora do catálogo, um por linha'),
        equipe: z.string().optional().describe('Uma linha por pessoa ou função'),
        condicoes: z.string().optional().describe('Uma linha por condição comercial'),
        mobilizacao: z.number().optional().describe('Valor da mobilização em reais'),
        diaria: z.number().optional().describe('Valor da diária em reais'),
        dias: z.number().optional().describe('Quantidade de diárias. Se vazio, usa as datas'),
        validadeDias: z.number().optional().describe('Validade da proposta em dias. Padrão 15'),
        idModelo: z.string().optional().describe('UUID do modelo. Se vazio, usa o primeiro disponível'),
        gerarPdf: z.boolean().optional(),
        enviar: z.boolean().optional(),
      },
    },
    async (entrada) => {
      try {
        const proposta = await montarPropostaSalva(api, entrada);
        return responder(proposta);
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'gerar_pdf',
    {
      title: 'Gerar PDF',
      description: 'Enfileira a geração do PDF da proposta.',
      inputSchema: {
        idProposta: z.string().describe('UUID ou slug da proposta'),
      },
    },
    async ({ idProposta }) => {
      try {
        const resultado = await api.post(`/proposals/${idProposta}/generate`);
        return responder(resultado);
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );

  servidor.registerTool(
    'enviar_proposta',
    {
      title: 'Enviar proposta',
      description: 'Marca a proposta como enviada. O cliente passa a poder abrir o link público.',
      inputSchema: {
        idProposta: z.string().describe('UUID ou slug da proposta'),
      },
    },
    async ({ idProposta }) => {
      try {
        const resultado = await api.post(`/proposals/${idProposta}/send`);
        const dados = item(resultado as Envelope<Record<string, unknown>>);
        let slug = '';
        if (dados && dados.publicSlug) {
          slug = String(dados.publicSlug);
        }
        if (!slug) {
          const detalhe = (await api.get(`/proposals/${idProposta}`)) as Envelope<Record<string, unknown>>;
          const proposta = item(detalhe);
          if (proposta && proposta.publicSlug) {
            slug = String(proposta.publicSlug);
          }
        }
        return responder({
          proposta: dados,
          linkPublico: linkPublico(api.urlWeb(), slug),
        });
      } catch (erro) {
        return responderErro(erro);
      }
    },
  );
}

async function montarPropostaSalva(api: ClienteCota, dados: DadosMontagem) {
  const clientesResposta = (await api.get('/clients')) as Envelope<ClienteResumo[]>;
  const servicosResposta = (await api.get('/equipment')) as Envelope<ServicoResumo[]>;
  const modelosResposta = (await api.get('/templates')) as Envelope<ModeloResumo[]>;

  const clientes = lista(clientesResposta);
  const catalogo = lista(servicosResposta);
  const modelos = lista(modelosResposta);

  const modelo = escolherModelo(modelos, dados.idModelo);
  if (!modelo) {
    throw new Error('Nenhum modelo de proposta disponível.');
  }

  let idCliente = dados.idCliente;
  if (!idCliente && dados.nomeCliente) {
    const existente = casarClientePorNome(dados.nomeCliente, clientes);
    if (existente) {
      idCliente = existente.id;
    }
    if (!existente) {
      const criado = (await api.post('/clients', {
        name: dados.nomeCliente,
        companyName: dados.empresaCliente,
        email: dados.emailCliente,
        phone: dados.telefoneCliente,
      })) as Envelope<ClienteResumo>;
      const cliente = item(criado);
      if (!cliente) {
        throw new Error('Não foi possível cadastrar o cliente.');
      }
      idCliente = cliente.id;
    }
  }

  let validadeDias = dados.validadeDias;
  if (!validadeDias) {
    validadeDias = 15;
  }

  const extrasInformados = separarLinhas(dados.servicosExtras);
  const casados = casarServicosPorNome(extrasInformados, catalogo);
  const idsServicos = [...(dados.idsServicos || []), ...casados.ids];

  const montagem: DadosMontagem = {
    ...dados,
    idsServicos,
    servicosExtras: casados.extras.join('\n'),
    validadeDias,
  };

  const totais = montarTotais(montagem);
  const payload = montarPayloadProposta(montagem, catalogo);
  let titulo = dados.titulo;
  if (!titulo) {
    titulo = modelo.name;
  }

  const corpo: Record<string, unknown> = {
    templateId: modelo.id,
    title: titulo,
    payload,
    totals: totais,
  };
  if (idCliente) {
    corpo.clientId = idCliente;
  }
  const expiresAt = montarDataExpiracao(validadeDias);
  if (expiresAt) {
    corpo.expiresAt = expiresAt;
  }

  const criada = (await api.post('/proposals', corpo)) as Envelope<Record<string, unknown>>;

  const proposta = item(criada);
  if (!proposta) {
    throw new Error('Não foi possível salvar a proposta.');
  }

  const idProposta = String(proposta.id);
  const slug = String(proposta.publicSlug || '');

  if (dados.gerarPdf) {
    await api.post(`/proposals/${idProposta}/generate`);
  }
  if (dados.enviar) {
    await api.post(`/proposals/${idProposta}/send`);
  }

  return {
    proposta: resumoProposta(proposta),
    totais,
    payload,
    idModelo: modelo.id,
    modelo: modelo.name,
    linkPublico: linkPublico(api.urlWeb(), slug),
    pdfEnfileirado: Boolean(dados.gerarPdf),
    enviada: Boolean(dados.enviar),
  };
}
