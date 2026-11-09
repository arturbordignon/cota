const UM_DIA = 24 * 60 * 60 * 1000;
export const VALIDADE_PADRAO = 15;

export type Idioma = 'pt-BR' | 'en';

export type DadosMontagem = {
  idCliente?: string;
  nomeCliente?: string;
  empresaCliente?: string;
  emailCliente?: string;
  telefoneCliente?: string;
  titulo?: string;
  localOperacao?: string;
  dataInicio?: string;
  dataFim?: string;
  escopo?: string;
  idsServicos?: string[];
  servicosExtras?: string;
  equipe?: string;
  condicoes?: string;
  mobilizacao?: number;
  diaria?: number;
  dias?: number;
  validadeDias?: number;
  idModelo?: string;
  gerarPdf?: boolean;
  enviar?: boolean;
};

export type ClienteResumo = {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type ServicoResumo = {
  id: string;
  name: string;
  capacityTons?: number | null;
  dailyRate?: string | number | null;
  specsJson?: { description?: string; notes?: string } | null;
};

export type ModeloResumo = {
  id: string;
  name: string;
  accountId?: string | null;
  isActive?: boolean;
  locale?: string;
  defaultDataJson?: { team?: unknown; terms?: unknown } | null;
};

export type PadroesProposta = {
  terms: string[];
  team: string[];
  validityDays: number | null;
};

export type Empresa = {
  name?: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
};

export type Equipamento = { name: string; capacity: string; reach: string; notes: string };

export type PayloadProposta = {
  job: { projectName: string; siteLocation: string; schedule: string; scope: string[] };
  equipment: Equipamento[];
  team: string[];
  terms: string[];
  pricing: { validity: string };
};

export type Totais = { mobilization: number; dailyRate: number; days: number };

// Text written into the proposal itself, in the language of the template the
// client reads (the same wording as the proposal wizard in the web app).
const TEXTO: Record<
  Idioma,
  {
    aPartirDe: (data: string) => string;
    intervalo: (inicio: string, fim: string) => string;
    capacidade: (toneladas: number) => string;
    validade: (dias: number) => string;
  }
> = {
  'pt-BR': {
    aPartirDe: (data) => `A partir de ${data}`,
    intervalo: (inicio, fim) => `${inicio} a ${fim}`,
    capacidade: (toneladas) => `Capacidade ${toneladas} t`,
    validade: (dias) => `Valores válidos por ${dias} dias corridos.`,
  },
  en: {
    aPartirDe: (data) => `From ${data}`,
    intervalo: (inicio, fim) => `${inicio} to ${fim}`,
    capacidade: (toneladas) => `Capacity ${toneladas} t`,
    validade: (dias) => `Prices valid for ${dias} calendar days.`,
  },
};

export function paraIdioma(valor?: string | null): Idioma {
  return valor === 'en' ? 'en' : 'pt-BR';
}

function texto(valor: unknown) {
  if (typeof valor !== 'string') {
    return '';
  }
  return valor.trim();
}

function numero(valor: unknown) {
  if (typeof valor !== 'number') {
    return 0;
  }
  if (!Number.isFinite(valor) || valor < 0) {
    return 0;
  }
  return valor;
}

function listaDeTextos(valor: unknown) {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export function separarLinhas(valor: unknown) {
  const bruto = texto(valor);
  if (!bruto) {
    return [];
  }
  return bruto
    .split('\n')
    .map((linha) => linha.trim())
    .filter((linha) => linha.length > 0);
}

function formatarData(data: string, idioma: Idioma) {
  if (!data) {
    return '';
  }
  return new Date(`${data}T00:00:00Z`).toLocaleDateString(idioma, { timeZone: 'UTC' });
}

export function montarPeriodo(inicio: string, fim: string, idioma: Idioma = 'pt-BR') {
  if (!inicio) {
    return '';
  }
  if (!fim) {
    return TEXTO[idioma].aPartirDe(formatarData(inicio, idioma));
  }
  return TEXTO[idioma].intervalo(formatarData(inicio, idioma), formatarData(fim, idioma));
}

export function calcularDias(inicio: string, fim: string) {
  if (!inicio) {
    return 0;
  }
  if (!fim) {
    return 0;
  }
  const diferenca = new Date(`${fim}T00:00:00`).getTime() - new Date(`${inicio}T00:00:00`).getTime();
  if (diferenca < 0) {
    return 0;
  }
  return Math.round(diferenca / UM_DIA) + 1;
}

function descreverCapacidade(servico: ServicoResumo, idioma: Idioma) {
  if (!servico.capacityTons) {
    return '';
  }
  return TEXTO[idioma].capacidade(servico.capacityTons);
}

export function montarEquipamentos(
  ids: string[],
  extras: string[],
  catalogo: ServicoResumo[],
  idioma: Idioma = 'pt-BR',
): Equipamento[] {
  const selecionados = catalogo
    .filter((servico) => ids.includes(servico.id))
    .map((servico) => ({
      name: servico.name,
      capacity: descreverCapacidade(servico, idioma),
      reach: servico.specsJson?.description ?? '',
      notes: servico.specsJson?.notes ?? '',
    }));

  const avulsos = extras.map((nome) => ({
    name: nome,
    capacity: '',
    reach: '',
    notes: '',
  }));

  return [...selecionados, ...avulsos];
}

// Accents, case and punctuation don't count: "guindaste todo terreno 90t"
// is the same as "Guindaste todo-terreno 90 t".
function normalizarNome(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/(\d) (?=[a-z])/g, '$1')
    .trim();
}

export function casarServicosPorNome(nomes: string[], catalogo: ServicoResumo[]) {
  const ids: string[] = [];
  const extras: string[] = [];
  for (const nome of nomes) {
    const alvo = normalizarNome(nome);
    const encontrado = catalogo.find((servico) => normalizarNome(servico.name) === alvo);
    if (!encontrado) {
      extras.push(nome);
      continue;
    }
    ids.push(encontrado.id);
  }
  return { ids, extras };
}

// Matches the contact name or the company, ignoring accents and case, so
// "Atlantica Montagens" finds "Atlântica Montagens".
export function casarClientePorNome(nome: string, clientes: ClienteResumo[]) {
  const alvo = normalizarNome(nome);
  return (
    clientes.find((cliente) => normalizarNome(cliente.name) === alvo) ??
    clientes.find((cliente) => cliente.companyName && normalizarNome(cliente.companyName) === alvo)
  );
}

// Without an id: the account's own template, else the standard one in the
// account's language (there is one per language), else any active one.
export function escolherModelo(modelos: ModeloResumo[], idModelo?: string, idioma?: string) {
  if (idModelo) {
    return modelos.find((modelo) => modelo.id === idModelo);
  }
  const ativos = modelos.filter((modelo) => modelo.isActive !== false);
  const daConta = ativos.find((modelo) => modelo.accountId);
  if (daConta) {
    return daConta;
  }
  const noIdioma = ativos.find((modelo) => modelo.locale === paraIdioma(idioma));
  return noIdioma ?? ativos[0];
}

export function montarValidade(dias: number, idioma: Idioma = 'pt-BR') {
  if (!dias) {
    return '';
  }
  return TEXTO[idioma].validade(dias);
}

export function montarDataExpiracao(dias: number) {
  if (!dias) {
    return undefined;
  }
  return new Date(Date.now() + dias * UM_DIA).toISOString();
}

// What the person didn't say comes from the saved defaults (Minha conta), or,
// on the company's own template, from that template. The standard templates
// only hold sample text from a made-up company, so nothing comes from them.
export function aplicarPadroes(dados: DadosMontagem, padroes: PadroesProposta | null, modelo?: ModeloResumo) {
  const doModelo = modelo?.accountId ? modelo.defaultDataJson ?? null : null;
  const completos: DadosMontagem = { ...dados };
  const origem: string[] = [];

  if (!separarLinhas(dados.condicoes).length) {
    if (padroes?.terms.length) {
      completos.condicoes = padroes.terms.join('\n');
      origem.push('condicoes');
    } else if (listaDeTextos(doModelo?.terms).length) {
      completos.condicoes = listaDeTextos(doModelo?.terms).join('\n');
      origem.push('condicoes');
    }
  }
  if (!separarLinhas(dados.equipe).length) {
    if (padroes?.team.length) {
      completos.equipe = padroes.team.join('\n');
      origem.push('equipe');
    } else if (listaDeTextos(doModelo?.team).length) {
      completos.equipe = listaDeTextos(doModelo?.team).join('\n');
      origem.push('equipe');
    }
  }
  if (!dados.validadeDias) {
    completos.validadeDias = padroes?.validityDays || VALIDADE_PADRAO;
  }
  return { dados: completos, preenchidosPelosPadroes: origem };
}

export function montarPayloadProposta(
  dados: DadosMontagem,
  catalogo: ServicoResumo[],
  idioma: Idioma = 'pt-BR',
): PayloadProposta {
  const titulo = texto(dados.titulo);
  const ids = dados.idsServicos || [];
  const extras = separarLinhas(dados.servicosExtras);
  return {
    job: {
      projectName: titulo,
      siteLocation: texto(dados.localOperacao),
      schedule: montarPeriodo(texto(dados.dataInicio), texto(dados.dataFim), idioma),
      scope: separarLinhas(dados.escopo),
    },
    equipment: montarEquipamentos(ids, extras, catalogo, idioma),
    team: separarLinhas(dados.equipe),
    terms: separarLinhas(dados.condicoes),
    pricing: {
      validity: montarValidade(numero(dados.validadeDias), idioma),
    },
  };
}

export function montarTotais(dados: DadosMontagem): Totais {
  let dias = Math.round(numero(dados.dias));
  if (!dias) {
    dias = calcularDias(texto(dados.dataInicio), texto(dados.dataFim));
  }
  return {
    mobilization: numero(dados.mobilizacao),
    dailyRate: numero(dados.diaria),
    days: dias,
  };
}

export function calcularTotal(totais: Totais) {
  return Math.round((totais.mobilization + totais.dailyRate * totais.days) * 100) / 100;
}

export type MudancasProposta = Omit<DadosMontagem, 'nomeCliente' | 'empresaCliente' | 'emailCliente' | 'telefoneCliente' | 'idModelo' | 'gerarPdf' | 'enviar'>;

function lerPayload(bruto: unknown): PayloadProposta {
  const dados = (bruto && typeof bruto === 'object' ? bruto : {}) as Partial<PayloadProposta> & Record<string, unknown>;
  const job = (dados.job ?? {}) as Partial<PayloadProposta['job']>;
  return {
    ...dados,
    job: {
      ...job,
      projectName: texto(job.projectName),
      siteLocation: texto(job.siteLocation),
      schedule: texto(job.schedule),
      scope: listaDeTextos(job.scope),
    },
    equipment: Array.isArray(dados.equipment) ? (dados.equipment as Equipamento[]) : [],
    team: listaDeTextos(dados.team),
    terms: listaDeTextos(dados.terms),
    pricing: { ...(dados.pricing ?? {}), validity: texto(dados.pricing?.validity) },
  };
}

function lerTotais(bruto: unknown): Totais {
  const dados = (bruto && typeof bruto === 'object' ? bruto : {}) as Partial<Totais>;
  return {
    mobilization: numero(dados.mobilization),
    dailyRate: numero(dados.dailyRate),
    days: Math.round(numero(dados.days)),
  };
}

// Applies only what the person asked to change to a saved proposal. Lists
// (scope, crew, terms, equipment) are replaced whole; the period needs the
// start date, and the number of days follows the new dates unless given.
export function aplicarMudancas(
  payloadAtual: unknown,
  totaisAtuais: unknown,
  mudancas: MudancasProposta,
  catalogo: ServicoResumo[],
  idioma: Idioma = 'pt-BR',
) {
  const payload = lerPayload(payloadAtual);
  const totais = lerTotais(totaisAtuais);
  const alterados: string[] = [];

  if (mudancas.titulo !== undefined) {
    payload.job.projectName = texto(mudancas.titulo);
    alterados.push('titulo');
  }
  if (mudancas.localOperacao !== undefined) {
    payload.job.siteLocation = texto(mudancas.localOperacao);
    alterados.push('localOperacao');
  }
  if (mudancas.dataInicio !== undefined) {
    payload.job.schedule = montarPeriodo(texto(mudancas.dataInicio), texto(mudancas.dataFim), idioma);
    alterados.push('periodo');
    if (mudancas.dias === undefined) {
      const dias = calcularDias(texto(mudancas.dataInicio), texto(mudancas.dataFim));
      if (dias) {
        totais.days = dias;
      }
    }
  }
  if (mudancas.escopo !== undefined) {
    payload.job.scope = separarLinhas(mudancas.escopo);
    alterados.push('escopo');
  }
  if (mudancas.idsServicos !== undefined || mudancas.servicosExtras !== undefined) {
    const extras = separarLinhas(mudancas.servicosExtras);
    const casados = casarServicosPorNome(extras, catalogo);
    payload.equipment = montarEquipamentos(
      [...(mudancas.idsServicos ?? []), ...casados.ids],
      casados.extras,
      catalogo,
      idioma,
    );
    alterados.push('equipamentos');
  }
  if (mudancas.equipe !== undefined) {
    payload.team = separarLinhas(mudancas.equipe);
    alterados.push('equipe');
  }
  if (mudancas.condicoes !== undefined) {
    payload.terms = separarLinhas(mudancas.condicoes);
    alterados.push('condicoes');
  }
  if (mudancas.validadeDias !== undefined) {
    payload.pricing.validity = montarValidade(numero(mudancas.validadeDias), idioma);
    alterados.push('validade');
  }
  if (mudancas.mobilizacao !== undefined) {
    totais.mobilization = numero(mudancas.mobilizacao);
    alterados.push('mobilizacao');
  }
  if (mudancas.diaria !== undefined) {
    totais.dailyRate = numero(mudancas.diaria);
    alterados.push('diaria');
  }
  if (mudancas.dias !== undefined) {
    totais.days = Math.round(numero(mudancas.dias));
    alterados.push('dias');
  }

  return { payload, totais, alterados };
}

export type Aviso = { campo: string; mensagem: string };

export type ContextoRevisao = {
  payload: unknown;
  totais: unknown;
  cliente?: { email?: string | null; phone?: string | null } | null;
  empresa?: Empresa | null;
  modeloDaConta: boolean;
  catalogo?: ServicoResumo[];
};

const AVISOS: Record<Idioma, Record<string, string>> = {
  'pt-BR': {
    cliente: 'A proposta não tem cliente.',
    contato: 'O cliente não tem telefone nem e-mail cadastrado.',
    local: 'Falta o local da operação.',
    periodo: 'Falta o período (data de início e de fim).',
    escopo: 'Falta o escopo do serviço.',
    equipamentos: 'Nenhum equipamento na proposta.',
    equipe: 'Falta a equipe (operador, rigger, sinaleiro...).',
    condicoes: 'Faltam as condições comerciais (pagamento, o que está incluso).',
    valores: 'A proposta está sem valores: mobilização e diária zeradas.',
    dias: 'Há diária mas nenhum dia de operação: o total fica só com a mobilização.',
    validade: 'A proposta não tem validade.',
    empresa: 'Faltam dados da sua empresa no PDF: {campos}. Dá para salvar com salvar_empresa.',
    modelo: 'Usa o modelo padrão do Cota, sem o logo da sua empresa. O logo entra criando um modelo na tela Modelos.',
    diariaCatalogo: 'A diária de {valor} está bem diferente da do catálogo para {equipamento} ({catalogo}).',
  },
  en: {
    cliente: 'The proposal has no client.',
    contato: 'The client has no phone or email on file.',
    local: 'The site location is missing.',
    periodo: 'The period (start and end date) is missing.',
    escopo: 'The scope of work is missing.',
    equipamentos: 'There is no equipment on the proposal.',
    equipe: 'The crew is missing (operator, rigger, signaller...).',
    condicoes: 'The commercial terms are missing (payment, what is included).',
    valores: 'The proposal has no prices: mobilization and daily rate are zero.',
    dias: 'There is a daily rate but no operating days: the total is only the mobilization.',
    validade: 'The proposal has no validity.',
    empresa: 'Your company details are missing on the PDF: {campos}. Save them with salvar_empresa.',
    modelo: "Uses Cota's standard template, without your company logo. Add the logo by creating a template on the Templates page.",
    diariaCatalogo: 'The daily rate of {valor} is far from the catalog rate for {equipamento} ({catalogo}).',
  },
};

const CAMPOS_EMPRESA: Record<Idioma, Record<string, string>> = {
  'pt-BR': { name: 'nome', cnpj: 'CNPJ', phone: 'telefone' },
  en: { name: 'name', cnpj: 'tax ID', phone: 'phone' },
};

export function empresaFaltando(empresa: Empresa | null | undefined) {
  return (['name', 'cnpj', 'phone'] as const).filter((campo) => !texto(empresa?.[campo]));
}

// What would make the client hesitate or ask again: the checklist the
// assistant goes through with the person before the link goes out.
export function revisarProposta(contexto: ContextoRevisao, idioma: Idioma = 'pt-BR'): Aviso[] {
  const payload = lerPayload(contexto.payload);
  const totais = lerTotais(contexto.totais);
  const textos = AVISOS[idioma];
  const avisos: Aviso[] = [];
  const avisar = (campo: string, troca: Record<string, string> = {}) => {
    let mensagem = textos[campo];
    for (const [chave, valor] of Object.entries(troca)) {
      mensagem = mensagem.replace(`{${chave}}`, valor);
    }
    avisos.push({ campo, mensagem });
  };

  if (contexto.cliente === null || contexto.cliente === undefined) {
    avisar('cliente');
  } else if (!texto(contexto.cliente.email) && !texto(contexto.cliente.phone)) {
    avisar('contato');
  }
  if (!payload.job.siteLocation) avisar('local');
  if (!payload.job.schedule) avisar('periodo');
  if (!payload.job.scope.length) avisar('escopo');
  if (!payload.equipment.length) avisar('equipamentos');
  if (!payload.team.length) avisar('equipe');
  if (!payload.terms.length) avisar('condicoes');
  if (!totais.mobilization && !totais.dailyRate) {
    avisar('valores');
  } else if (totais.dailyRate && !totais.days) {
    avisar('dias');
  }
  if (!payload.pricing.validity) avisar('validade');

  // A daily rate more than 30% away from the catalog is often a typo.
  if (totais.dailyRate) {
    for (const item of payload.equipment) {
      const doCatalogo = contexto.catalogo?.find((servico) => servico.name === item.name);
      const referencia = Number(doCatalogo?.dailyRate ?? 0);
      if (referencia > 0 && Math.abs(totais.dailyRate - referencia) / referencia > 0.3) {
        avisar('diariaCatalogo', {
          valor: String(totais.dailyRate),
          equipamento: item.name,
          catalogo: String(referencia),
        });
        break;
      }
    }
  }

  const faltando = empresaFaltando(contexto.empresa);
  if (faltando.length) {
    avisar('empresa', { campos: faltando.map((campo) => CAMPOS_EMPRESA[idioma][campo]).join(', ') });
  }
  if (!contexto.modeloDaConta) avisar('modelo');

  return avisos;
}

export function linkPublico(urlWeb: string, slug: string) {
  return `${urlWeb}/p/${slug}`;
}
