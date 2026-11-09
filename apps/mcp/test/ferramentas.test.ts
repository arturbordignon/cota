import { describe, expect, it } from 'vitest';

import { ErroApi, type ClienteCota } from '../src/cliente-api.js';
import { editarProposta, explicarErro, montarProposta } from '../src/ferramentas.js';
import { avaliarConta } from '../src/preparo.js';

type Chamada = { metodo: string; caminho: string; corpo?: unknown };

// A stand-in for the Cota API: answers GETs from fixed data and records writes.
function apiFalsa(dados: Record<string, unknown>, opcoes: { negar?: string[] } = {}) {
  const chamadas: Chamada[] = [];
  const responder = (caminho: string) => {
    if (opcoes.negar?.includes(caminho)) {
      throw new ErroApi('Forbidden', 403);
    }
    if (!(caminho in dados)) {
      throw new ErroApi(`sem dado para ${caminho}`, 404);
    }
    return dados[caminho];
  };
  const api = {
    urlWeb: () => 'https://app.cota.test',
    get: async (caminho: string) => {
      chamadas.push({ metodo: 'GET', caminho });
      return responder(caminho);
    },
    post: async (caminho: string, corpo?: unknown) => {
      chamadas.push({ metodo: 'POST', caminho, corpo });
      if (caminho === '/clients') return { data: { id: 'cliente-novo', name: (corpo as { name: string }).name } };
      if (caminho === '/proposals') return { data: { id: 'p1', publicSlug: 'obra-0142', title: 'Obra', status: 'DRAFT' } };
      return { data: {} };
    },
    put: async (caminho: string, corpo?: unknown) => {
      chamadas.push({ metodo: 'PUT', caminho, corpo });
      return { data: corpo };
    },
    patch: async (caminho: string, corpo?: unknown) => {
      chamadas.push({ metodo: 'PATCH', caminho, corpo });
      return { data: { id: 'p1', publicSlug: 'obra-0142', status: 'DRAFT' } };
    },
  };
  return { api: api as unknown as ClienteCota, chamadas };
}

const contaPronta = {
  '/auth/me': { user: { name: 'Ana', role: 'OWNER' }, account: { name: 'Horizonte', locale: 'pt-BR' } },
  '/account': { data: { company: { name: 'Horizonte', cnpj: '12.345.678/0001-90', phone: '(11) 4002-8922' } } },
  '/templates': {
    data: [
      { id: 'padrao', name: 'Padrão', accountId: null, locale: 'pt-BR', defaultDataJson: { terms: ['Texto de exemplo.'] } },
    ],
  },
  '/equipment': { data: [{ id: 'g90', name: 'Guindaste 90 t', capacityTons: 90, dailyRate: '9000.00' }] },
  '/clients': { data: [{ id: 'c1', name: 'Marcos', companyName: 'Atlântica Montagens', phone: '(13) 99999-0000' }] },
  '/account/proposal-defaults': { data: { terms: ['Pagamento: 40% na confirmação.'], team: ['Operador certificado'], validityDays: 10 } },
  '/billing/overview': { data: { plan: { name: 'Teste grátis', currency: 'BRL', isTrial: true }, usage: { used: 2, total: 10 }, canCreate: true } },
};

describe('preparar_proposta', () => {
  const base = {
    usuario: { nome: 'Ana', papel: 'OWNER' },
    conta: { nome: 'Horizonte', idioma: 'pt-BR' },
    modelos: [],
    padroes: null,
    cobranca: null,
    urlWeb: 'https://app.cota.test',
  };

  it('guides a new account through company, catalog and terms', () => {
    const avaliacao = avaliarConta({ ...base, empresa: { name: 'Horizonte' }, catalogo: [] });
    expect(avaliacao.modo).toBe('guiado');
    expect(avaliacao.passosQueFaltam.map((passo) => passo.id)).toEqual(['empresa', 'catalogo', 'condicoes', 'modelo']);
    expect(avaliacao.passosQueFaltam[0]).toMatchObject({ ferramenta: 'salvar_empresa' });
    expect(avaliacao.empresa.faltando).toEqual(['cnpj', 'phone']);
  });

  it('goes straight to the proposal when only the own template is missing', () => {
    const avaliacao = avaliarConta({
      ...base,
      empresa: { name: 'Horizonte', cnpj: '1', phone: '2' },
      catalogo: [{ id: 'g', name: 'Guindaste' }],
      padroes: { terms: ['À vista'], team: [], validityDays: null },
    });
    expect(avaliacao.modo).toBe('rapido');
    expect(avaliacao.modelos.usaPadraoDoCota).toBe(true);
    expect(avaliacao.catalogo).toEqual({ visivel: true, total: 1, semDiaria: ['Guindaste'] });
  });

  it("does not offer tools a salesperson can't use", () => {
    const avaliacao = avaliarConta({
      ...base,
      usuario: { nome: 'Bruno', papel: 'MEMBER', permissoes: { services: { view: true, edit: false }, templates: { view: true, edit: false } } },
      empresa: {},
      catalogo: [],
    });
    expect(avaliacao.usuario.podeEditarEmpresa).toBe(false);
    expect(avaliacao.passosQueFaltam.every((passo) => passo.ferramenta === null)).toBe(true);
  });

  it('says when the plan allows no more proposals', () => {
    const avaliacao = avaliarConta({
      ...base,
      empresa: {},
      catalogo: null,
      cobranca: { plan: { name: 'Teste grátis', isTrial: true }, usage: { used: 3, total: 10 }, trial: { endsAt: '2026-11-01', ended: true }, canCreate: false },
    });
    expect(avaliacao.plano).toMatchObject({ podeCriar: false, testeGratis: true, linkPlanos: 'https://app.cota.test/plans' });
    expect(avaliacao.catalogo).toEqual({ visivel: false });
  });
});

describe('montar_proposta', () => {
  const pedido = {
    nomeCliente: 'atlantica montagens',
    titulo: 'Içamento de treliças',
    localOperacao: 'Porto de Santos, SP',
    dataInicio: '2027-10-21',
    dataFim: '2027-10-23',
    escopo: 'Içamento de treliças metálicas, com operador.',
    servicosExtras: 'guindaste 90 t',
    mobilizacao: 6300,
    diaria: 9000,
  };

  it('previews without saving or counting anything', async () => {
    const { api, chamadas } = apiFalsa(contaPronta);
    const previa = await montarProposta(api, { ...pedido, apenasPrevia: true });
    expect(previa.salva).toBe(false);
    expect(chamadas.filter((chamada) => chamada.metodo !== 'GET')).toEqual([]);
    expect(previa.resumo).toMatchObject({
      cliente: 'Marcos',
      equipamentos: ['Guindaste 90 t'],
      condicoes: ['Pagamento: 40% na confirmação.'],
      equipe: ['Operador certificado'],
      validade: 'Valores válidos por 10 dias corridos.',
      dias: 3,
      total: 33300,
      moeda: 'BRL',
    });
    // Only the standard template is available, so the logo note comes up.
    expect(previa.avisos.map((aviso) => aviso.campo)).toEqual(['modelo']);
  });

  it('saves with the existing client and the catalog equipment', async () => {
    const { api, chamadas } = apiFalsa(contaPronta);
    const salva = await montarProposta(api, pedido);
    expect(salva.salva).toBe(true);
    expect(salva).toMatchObject({ linkPublico: 'https://app.cota.test/p/obra-0142', clienteNovo: false });
    const criacao = chamadas.find((chamada) => chamada.caminho === '/proposals');
    expect(criacao?.corpo).toMatchObject({
      templateId: 'padrao',
      clientId: 'c1',
      title: 'Içamento de treliças',
      totals: { mobilization: 6300, dailyRate: 9000, days: 3 },
    });
    expect(chamadas.some((chamada) => chamada.metodo === 'POST' && chamada.caminho === '/clients')).toBe(false);
  });

  it('registers a client that does not exist yet', async () => {
    const { api, chamadas } = apiFalsa(contaPronta);
    await montarProposta(api, { ...pedido, nomeCliente: 'Usina Bom Retiro' });
    const cadastro = chamadas.find((chamada) => chamada.metodo === 'POST' && chamada.caminho === '/clients');
    expect(cadastro?.corpo).toMatchObject({ name: 'Usina Bom Retiro' });
    expect(chamadas.find((chamada) => chamada.caminho === '/proposals')?.corpo).toMatchObject({ clientId: 'cliente-novo' });
  });

  it("works for a salesperson who can't see the catalog", async () => {
    const { api } = apiFalsa(contaPronta, { negar: ['/equipment', '/billing/overview'] });
    const previa = await montarProposta(api, { ...pedido, apenasPrevia: true });
    expect(previa.resumo.equipamentos).toEqual(['guindaste 90 t']);
  });
});

describe('editar_proposta', () => {
  const salva = {
    data: {
      id: 'p1',
      status: 'SENT',
      publicSlug: 'obra-0142',
      locale: 'pt-BR',
      pdfObjectKey: 'accounts/a/proposals/p1/proposta.pdf',
      client: { id: 'c1', name: 'Marcos', phone: '(13) 99999-0000' },
      template: { id: 'padrao', accountId: null, locale: 'pt-BR' },
      payloadJson: {
        job: { projectName: 'Obra', siteLocation: 'Santos', schedule: '21/10/2027 a 23/10/2027', scope: ['Içamento'] },
        equipment: [{ name: 'Guindaste 90 t', capacity: '', reach: '', notes: '' }],
        team: ['Operador'],
        terms: ['À vista'],
        pricing: { validity: 'Valores válidos por 15 dias corridos.' },
      },
      totalsJson: { mobilization: 6300, dailyRate: 9000, days: 3, total: 33300 },
    },
  };

  it('patches the same proposal instead of creating another', async () => {
    const { api, chamadas } = apiFalsa({ ...contaPronta, '/proposals/p1': salva });
    const resultado = await editarProposta(api, { idProposta: 'p1', diaria: 8500 });
    expect(chamadas.some((chamada) => chamada.metodo === 'POST')).toBe(false);
    const edicao = chamadas.find((chamada) => chamada.metodo === 'PATCH');
    expect(edicao?.corpo).toMatchObject({ totals: { mobilization: 6300, dailyRate: 8500, days: 3 } });
    expect(resultado.resumo.total).toBe(31800);
    expect(resultado.observacoes).toHaveLength(2);
  });

  it('leaves answered proposals alone', async () => {
    const aceita = { data: { ...salva.data, status: 'ACCEPTED' } };
    const { api } = apiFalsa({ ...contaPronta, '/proposals/p1': aceita });
    await expect(editarProposta(api, { idProposta: 'p1', diaria: 1 })).rejects.toThrow(/já respondeu/);
  });
});

describe('error messages', () => {
  it('points to the plans page when the trial is over', () => {
    const erro = new ErroApi('Seu teste grátis terminou.', 402, 'TRIAL_ENDED', 'https://app.cota.test/plans');
    expect(explicarErro(erro)).toBe('Seu teste grátis terminou. Planos: https://app.cota.test/plans');
  });
});
