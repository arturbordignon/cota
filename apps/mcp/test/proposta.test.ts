import { describe, expect, it } from 'vitest';

import {
  aplicarMudancas,
  aplicarPadroes,
  calcularDias,
  casarClientePorNome,
  casarServicosPorNome,
  escolherModelo,
  montarPayloadProposta,
  montarPeriodo,
  montarTotais,
  revisarProposta,
  separarLinhas,
} from '../src/proposta.js';

const padraoPt = { id: 'pt', name: 'Padrão', accountId: null, locale: 'pt-BR' };
const padraoEn = { id: 'en', name: 'Standard', accountId: null, locale: 'en' };

describe('escolherModelo', () => {
  it('uses the id it was given', () => {
    expect(escolherModelo([padraoPt, padraoEn], 'en')?.id).toBe('en');
  });

  it("prefers the account's own active template", () => {
    const proprio = { id: 'meu', name: 'Meu', accountId: 'conta', locale: 'pt-BR' };
    const inativo = { id: 'velho', name: 'Velho', accountId: 'conta', isActive: false };
    expect(escolherModelo([padraoPt, inativo, proprio], undefined, 'en')?.id).toBe('meu');
  });

  it("falls back to the standard template in the account's language", () => {
    expect(escolherModelo([padraoPt, padraoEn], undefined, 'en')?.id).toBe('en');
    expect(escolherModelo([padraoEn, padraoPt], undefined, 'pt-BR')?.id).toBe('pt');
    expect(escolherModelo([padraoEn, padraoPt])?.id).toBe('pt');
  });

  it('returns nothing when there is no active template', () => {
    expect(escolherModelo([{ ...padraoPt, isActive: false }])).toBeUndefined();
  });
});

describe('matching by name', () => {
  it('finds a client regardless of case', () => {
    const clientes = [{ id: '1', name: 'Usina Bom Retiro' }];
    expect(casarClientePorNome('usina bom retiro', clientes)?.id).toBe('1');
    expect(casarClientePorNome('Outra', clientes)).toBeUndefined();
  });

  it('keeps services missing from the catalog as extras', () => {
    const catalogo = [{ id: 'g1', name: 'Guindaste 90 t' }];
    expect(casarServicosPorNome(['guindaste 90 t', 'Munck 20 t'], catalogo)).toEqual({ ids: ['g1'], extras: ['Munck 20 t'] });
  });
});

describe('proposal contents', () => {
  it('splits text into trimmed lines and drops blank ones', () => {
    expect(separarLinhas('  Remoção do rolo \n\n Reinstalação  ')).toEqual(['Remoção do rolo', 'Reinstalação']);
    expect(separarLinhas(undefined)).toEqual([]);
  });

  it('counts both the first and the last day', () => {
    expect(calcularDias('2027-01-10', '2027-01-12')).toBe(3);
    expect(calcularDias('2027-01-12', '2027-01-10')).toBe(0);
  });

  it('uses the dates when the number of days is missing', () => {
    expect(montarTotais({ mobilizacao: 7000, diaria: 18750, dataInicio: '2027-01-10', dataFim: '2027-01-12' })).toEqual({
      mobilization: 7000,
      dailyRate: 18750,
      days: 3,
    });
    expect(montarTotais({ diaria: -5, dias: 2 })).toEqual({ mobilization: 0, dailyRate: 0, days: 2 });
  });

  it('fills the same payload as the new proposal screen', () => {
    const payload = montarPayloadProposta(
      { titulo: 'Parada da moenda', localOperacao: 'Sertãozinho, SP', escopo: 'Remoção\nReinstalação', servicosExtras: 'Munck 20 t', validadeDias: 15 },
      [],
    );
    expect(payload.job).toMatchObject({ projectName: 'Parada da moenda', siteLocation: 'Sertãozinho, SP', scope: ['Remoção', 'Reinstalação'] });
    expect(payload.equipment).toEqual([{ name: 'Munck 20 t', capacity: '', reach: '', notes: '' }]);
    expect(payload.pricing.validity).toBe('Valores válidos por 15 dias corridos.');
  });
});

describe('language of the proposal text', () => {
  it('writes period, capacity and validity in English for English templates', () => {
    const payload = montarPayloadProposta(
      { dataInicio: '2027-01-10', dataFim: '2027-01-12', validadeDias: 10, idsServicos: ['g1'] },
      [{ id: 'g1', name: 'Crane 90 t', capacityTons: 90 }],
      'en',
    );
    expect(payload.job.schedule).toBe('1/10/2027 to 1/12/2027');
    expect(payload.equipment[0].capacity).toBe('Capacity 90 t');
    expect(payload.pricing.validity).toBe('Prices valid for 10 calendar days.');
  });

  it('keeps Brazilian dates for Portuguese templates', () => {
    expect(montarPeriodo('2027-01-10', '2027-01-12', 'pt-BR')).toBe('10/01/2027 a 12/01/2027');
    expect(montarPeriodo('2027-01-10', '', 'pt-BR')).toBe('A partir de 10/01/2027');
  });
});

describe('matching ignores accents', () => {
  it('finds a client by company name without accents', () => {
    const clientes = [{ id: '1', name: 'Marcos Lima', companyName: 'Atlântica Montagens' }];
    expect(casarClientePorNome('atlantica montagens', clientes)?.id).toBe('1');
  });

  it('finds catalog equipment written without accents', () => {
    const catalogo = [{ id: 'm1', name: 'Caminhão Munck 30 t' }];
    expect(casarServicosPorNome(['caminhao munck 30 t'], catalogo).ids).toEqual(['m1']);
  });

  it('ignores hyphens and the space before the unit', () => {
    const catalogo = [{ id: 'g1', name: 'Guindaste todo-terreno 90 t' }];
    expect(casarServicosPorNome(['guindaste todo terreno 90t'], catalogo).ids).toEqual(['g1']);
    expect(casarServicosPorNome(['Guindaste todo-terreno 900 t'], catalogo).ids).toEqual([]);
  });
});

describe('saved defaults', () => {
  const padroes = { terms: ['Pagamento em 30 dias.'], team: ['Operador certificado'], validityDays: 10 };

  it('fills terms, crew and validity the person did not mention', () => {
    const { dados, preenchidosPelosPadroes } = aplicarPadroes({ titulo: 'Obra' }, padroes);
    expect(dados.condicoes).toBe('Pagamento em 30 dias.');
    expect(dados.equipe).toBe('Operador certificado');
    expect(dados.validadeDias).toBe(10);
    expect(preenchidosPelosPadroes).toEqual(['condicoes', 'equipe']);
  });

  it('keeps what the person said', () => {
    const { dados } = aplicarPadroes({ condicoes: 'À vista.', validadeDias: 5 }, padroes);
    expect(dados.condicoes).toBe('À vista.');
    expect(dados.validadeDias).toBe(5);
  });

  it("uses the company's own template text, never the sample text of the standard one", () => {
    const proprio = { id: 'm', name: 'Meu', accountId: 'conta', defaultDataJson: { terms: ['Do modelo.'], team: [] } };
    const padrao = { id: 'p', name: 'Padrão', accountId: null, defaultDataJson: { terms: ['Texto de exemplo.'] } };
    expect(aplicarPadroes({}, null, proprio).dados.condicoes).toBe('Do modelo.');
    expect(aplicarPadroes({}, null, padrao).dados.condicoes).toBeUndefined();
    expect(aplicarPadroes({}, null, padrao).dados.validadeDias).toBe(15);
  });
});

describe('editing a saved proposal', () => {
  const atual = {
    job: { projectName: 'Obra', siteLocation: 'Santos, SP', schedule: '10/01/2027 a 12/01/2027', scope: ['Içamento'] },
    equipment: [{ name: 'Guindaste 90 t', capacity: '', reach: '', notes: '' }],
    team: ['Operador'],
    terms: ['À vista'],
    pricing: { validity: 'Valores válidos por 15 dias corridos.' },
    company: { name: 'Fica como está' },
  };
  const totais = { mobilization: 6300, dailyRate: 9000, days: 3, total: 33300 };

  it('changes only what was asked', () => {
    const { payload, totais: novos, alterados } = aplicarMudancas(atual, totais, { diaria: 8500 }, []);
    expect(novos).toEqual({ mobilization: 6300, dailyRate: 8500, days: 3 });
    expect(payload.job).toEqual(atual.job);
    expect(payload.terms).toEqual(['À vista']);
    expect((payload as unknown as { company: unknown }).company).toEqual({ name: 'Fica como está' });
    expect(alterados).toEqual(['diaria']);
  });

  it('follows new dates with the number of days', () => {
    const { payload, totais: novos } = aplicarMudancas(atual, totais, { dataInicio: '2027-02-01', dataFim: '2027-02-05' }, []);
    expect(payload.job.schedule).toBe('01/02/2027 a 05/02/2027');
    expect(novos.days).toBe(5);
  });

  it('replaces the equipment list, using the catalog when the name matches', () => {
    const catalogo = [{ id: 'g2', name: 'Guindaste 220 t', capacityTons: 220 }];
    const { payload } = aplicarMudancas(atual, totais, { servicosExtras: 'guindaste 220 t\nCarreta prancha' }, catalogo);
    expect(payload.equipment.map((item) => item.name)).toEqual(['Guindaste 220 t', 'Carreta prancha']);
    expect(payload.equipment[0].capacity).toBe('Capacidade 220 t');
  });
});

describe('review before sending', () => {
  const completa = {
    job: { projectName: 'Obra', siteLocation: 'Santos, SP', schedule: '10/01/2027 a 12/01/2027', scope: ['Içamento'] },
    equipment: [{ name: 'Guindaste 90 t', capacity: '', reach: '', notes: '' }],
    team: ['Operador'],
    terms: ['À vista'],
    pricing: { validity: 'Valores válidos por 15 dias corridos.' },
  };
  const empresa = { name: 'Horizonte', cnpj: '12.345.678/0001-90', phone: '(11) 4002-8922' };

  it('has nothing to say about a complete proposal', () => {
    const avisos = revisarProposta({
      payload: completa,
      totais: { mobilization: 6300, dailyRate: 9000, days: 3 },
      cliente: { phone: '(13) 99999-0000' },
      empresa,
      modeloDaConta: true,
    });
    expect(avisos).toEqual([]);
  });

  it('lists what is missing in the language of the proposal', () => {
    const avisos = revisarProposta(
      { payload: {}, totais: { dailyRate: 9000 }, cliente: null, empresa: { name: 'Horizonte' }, modeloDaConta: false },
      'en',
    );
    const campos = avisos.map((aviso) => aviso.campo);
    expect(campos).toEqual(['cliente', 'local', 'periodo', 'escopo', 'equipamentos', 'equipe', 'condicoes', 'dias', 'validade', 'empresa', 'modelo']);
    expect(avisos.find((aviso) => aviso.campo === 'empresa')?.mensagem).toContain('tax ID, phone');
  });

  it('flags a daily rate far from the catalog', () => {
    const avisos = revisarProposta({
      payload: completa,
      totais: { mobilization: 6300, dailyRate: 900, days: 3 },
      cliente: { email: 'a@b.c' },
      empresa,
      modeloDaConta: true,
      catalogo: [{ id: 'g1', name: 'Guindaste 90 t', dailyRate: '9000.00' }],
    });
    expect(avisos.map((aviso) => aviso.campo)).toEqual(['diariaCatalogo']);
  });
});
