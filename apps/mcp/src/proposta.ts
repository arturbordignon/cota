const UM_DIA = 24 * 60 * 60 * 1000;

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
};

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

function formatarData(data: string) {
  if (!data) {
    return '';
  }
  return new Date(`${data}T00:00:00`).toLocaleDateString('pt-BR');
}

export function montarPeriodo(inicio: string, fim: string) {
  if (!inicio) {
    return '';
  }
  if (!fim) {
    return `A partir de ${formatarData(inicio)}`;
  }
  return `${formatarData(inicio)} a ${formatarData(fim)}`;
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

function descreverCapacidade(servico: ServicoResumo) {
  if (!servico.capacityTons) {
    return '';
  }
  return `Capacidade ${servico.capacityTons} t`;
}

export function montarEquipamentos(ids: string[], extras: string[], catalogo: ServicoResumo[]) {
  const selecionados = catalogo
    .filter((servico) => ids.includes(servico.id))
    .map((servico) => {
      let reach = '';
      let notes = '';
      if (servico.specsJson) {
        if (servico.specsJson.description) {
          reach = servico.specsJson.description;
        }
        if (servico.specsJson.notes) {
          notes = servico.specsJson.notes;
        }
      }
      return {
        name: servico.name,
        capacity: descreverCapacidade(servico),
        reach,
        notes,
      };
    });

  const avulsos = extras.map((nome) => ({
    name: nome,
    capacity: '',
    reach: '',
    notes: '',
  }));

  return [...selecionados, ...avulsos];
}

export function casarServicosPorNome(nomes: string[], catalogo: ServicoResumo[]) {
  const ids: string[] = [];
  const extras: string[] = [];
  for (const nome of nomes) {
    const encontrado = catalogo.find((servico) => servico.name.toLowerCase() === nome.toLowerCase());
    if (!encontrado) {
      extras.push(nome);
      continue;
    }
    ids.push(encontrado.id);
  }
  return { ids, extras };
}

export function casarClientePorNome(nome: string, clientes: ClienteResumo[]) {
  const alvo = nome.toLowerCase();
  return clientes.find((cliente) => cliente.name.toLowerCase() === alvo);
}

export function escolherModelo(modelos: ModeloResumo[], idModelo?: string) {
  if (idModelo) {
    return modelos.find((modelo) => modelo.id === idModelo);
  }
  const daConta = modelos.find((modelo) => modelo.accountId && modelo.isActive !== false);
  if (daConta) {
    return daConta;
  }
  return modelos.find((modelo) => modelo.isActive !== false);
}

export function montarValidade(dias: number) {
  if (!dias) {
    return '';
  }
  return `Valores válidos por ${dias} dias corridos.`;
}

export function montarDataExpiracao(dias: number) {
  if (!dias) {
    return undefined;
  }
  return new Date(Date.now() + dias * UM_DIA).toISOString();
}

export function montarPayloadProposta(dados: DadosMontagem, catalogo: ServicoResumo[]) {
  const titulo = texto(dados.titulo);
  const ids = dados.idsServicos || [];
  const extras = separarLinhas(dados.servicosExtras);
  return {
    job: {
      projectName: titulo,
      siteLocation: texto(dados.localOperacao),
      schedule: montarPeriodo(texto(dados.dataInicio), texto(dados.dataFim)),
      scope: separarLinhas(dados.escopo),
    },
    equipment: montarEquipamentos(ids, extras, catalogo),
    team: separarLinhas(dados.equipe),
    terms: separarLinhas(dados.condicoes),
    pricing: {
      validity: montarValidade(numero(dados.validadeDias)),
    },
  };
}

export function montarTotais(dados: DadosMontagem) {
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

export function linkPublico(urlWeb: string, slug: string) {
  return `${urlWeb}/p/${slug}`;
}
