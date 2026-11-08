import { describe, expect, it } from 'vitest';

import {
  calcularDias,
  casarClientePorNome,
  casarServicosPorNome,
  escolherModelo,
  montarPayloadProposta,
  montarTotais,
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
