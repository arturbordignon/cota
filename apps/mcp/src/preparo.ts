import { empresaFaltando, type Empresa, type ModeloResumo, type PadroesProposta, type ServicoResumo } from './proposta.js';

type Permissao = { view: boolean; edit: boolean };

export type DadosDaConta = {
  usuario: { nome: string; papel: string; permissoes?: Record<string, Permissao> };
  conta: { nome: string; idioma: string };
  empresa: Empresa | null;
  modelos: ModeloResumo[];
  // null when the person can't see the catalog.
  catalogo: ServicoResumo[] | null;
  padroes: PadroesProposta | null;
  cobranca: {
    plan?: { name?: string; isTrial?: boolean; isUnlimited?: boolean } | null;
    usage?: { used?: number; total?: number | null };
    trial?: { endsAt?: string | null; ended?: boolean } | null;
    canCreate?: boolean;
  } | null;
  urlWeb: string;
};

export type Passo = {
  id: 'empresa' | 'catalogo' | 'condicoes' | 'modelo';
  pergunta: string;
  ferramenta: string | null;
  link?: string;
};

function pode(permissoes: Record<string, Permissao> | undefined, modulo: string, acao: keyof Permissao) {
  if (!permissoes) {
    return false;
  }
  return Boolean(permissoes[modulo]?.[acao]);
}

// Decides how the conversation goes: "guiado" walks a new account through
// what makes a good proposal (company, catalog, usual terms) one question at
// a time, saving each answer so it is never asked again; "rapido" goes
// straight to the proposal and asks only what is missing.
export function avaliarConta(dados: DadosDaConta) {
  const { usuario, empresa, modelos, catalogo, padroes, cobranca, urlWeb } = dados;
  const dono = usuario.papel === 'OWNER';
  const podeEditarModelos = dono || pode(usuario.permissoes, 'templates', 'edit');
  const podeEditarServicos = dono || pode(usuario.permissoes, 'services', 'edit');

  const faltaNaEmpresa = empresaFaltando(empresa);
  const modelosDaConta = modelos.filter((modelo) => modelo.accountId && modelo.isActive !== false);
  const semDiaria = (catalogo ?? []).filter((servico) => !Number(servico.dailyRate)).map((servico) => servico.name);
  const temCondicoes = Boolean(padroes?.terms.length);

  const passos: Passo[] = [];
  if (faltaNaEmpresa.length) {
    passos.push({
      id: 'empresa',
      pergunta: `Dados da empresa que saem no PDF: ${faltaNaEmpresa.join(', ')}.`,
      ferramenta: dono ? 'salvar_empresa' : null,
      link: `${urlWeb}/account`,
    });
  }
  if (catalogo !== null && catalogo.length === 0) {
    passos.push({
      id: 'catalogo',
      pergunta: 'Quais equipamentos a empresa mais aluga? Para cada um: nome, capacidade e diária.',
      ferramenta: podeEditarServicos ? 'registrar_servico' : null,
      link: `${urlWeb}/services`,
    });
  }
  if (!temCondicoes) {
    passos.push({
      id: 'condicoes',
      pergunta:
        'Condições comerciais de sempre: forma de pagamento, o que está incluso (operador, combustível, ART, seguro), horas por dia e hora extra. E a equipe que costuma ir.',
      ferramenta: podeEditarModelos ? 'salvar_padroes' : null,
      link: `${urlWeb}/account`,
    });
  }
  if (!modelosDaConta.length) {
    passos.push({
      id: 'modelo',
      pergunta: 'Sem modelo próprio: a proposta sai no modelo padrão do Cota, sem logo. Avise e siga; o logo entra criando um modelo na tela.',
      ferramenta: null,
      link: `${urlWeb}/templates`,
    });
  }

  // The template alone doesn't hold anything up: the standard one works.
  const configurada = passos.every((passo) => passo.id === 'modelo');

  let restantes: number | null = null;
  const total = cobranca?.usage?.total;
  if (typeof total === 'number') {
    restantes = Math.max(total - (cobranca?.usage?.used ?? 0), 0);
  }
  const podeCriar = cobranca?.canCreate ?? (restantes === null || restantes > 0);

  return {
    modo: configurada ? ('rapido' as const) : ('guiado' as const),
    usuario: { nome: usuario.nome, papel: usuario.papel, podeEditarEmpresa: dono },
    conta: dados.conta,
    plano: {
      nome: cobranca?.plan?.name ?? null,
      testeGratis: Boolean(cobranca?.plan?.isTrial),
      testeTerminaEm: cobranca?.trial?.endsAt ?? null,
      propostasRestantes: restantes,
      podeCriar,
      linkPlanos: `${urlWeb}/plans`,
    },
    empresa: { completa: !faltaNaEmpresa.length, faltando: faltaNaEmpresa },
    modelos: {
      daConta: modelosDaConta.map((modelo) => modelo.name),
      usaPadraoDoCota: !modelosDaConta.length,
    },
    catalogo:
      catalogo === null
        ? { visivel: false }
        : { visivel: true, total: catalogo.length, semDiaria },
    padroes: {
      condicoes: padroes?.terms ?? [],
      equipe: padroes?.team ?? [],
      validadeDias: padroes?.validityDays ?? null,
    },
    passosQueFaltam: passos,
  };
}
