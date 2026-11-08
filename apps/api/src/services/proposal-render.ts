import type { FastifyInstance } from 'fastify';
import { createDownloadUrl } from '@cota/storage';

import { renderProposalHtml } from '../utils/render.js';

const VALIDADE_FOTOS_SEGUNDOS = 3600;

type Totais = {
  mobilization?: number;
  dailyRate?: number;
  days?: number;
  total?: number;
};

type Payload = {
  pricing?: Record<string, unknown>;
  [chave: string]: unknown;
};

// Values are written in the currency the account is billed in; the proposal's
// language only decides how the number looks (R$ 1.000,00 vs R$1,000.00).
export function moedaDaConta(conta: { currentPlan?: { currency: string } | null }) {
  return conta.currentPlan?.currency ?? 'BRL';
}

export function formatarMoeda(valor: number | undefined, locale: string, moeda: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: moeda }).format(Number(valor || 0));
}

export function buscarEmpresa(conta: { name: string; settingsJson: unknown }) {
  const configuracoes = conta.settingsJson as { company?: Record<string, string> } | null;
  const empresa = { name: conta.name, ...configuracoes?.company };
  if (!empresa.name) {
    empresa.name = conta.name;
  }
  return empresa;
}

function montarValores(proposta: { totalsJson: unknown; payloadJson: unknown; locale: string }, moeda: string) {
  const totais = proposta.totalsJson as Totais | null;
  const payload = proposta.payloadJson as Payload | null;
  if (!totais || typeof totais.total !== 'number') {
    return payload?.pricing;
  }

  return {
    ...payload?.pricing,
    mobilization: formatarMoeda(totais.mobilization, proposta.locale, moeda),
    dailyRate: formatarMoeda(totais.dailyRate, proposta.locale, moeda),
    days: totais.days,
    total: formatarMoeda(totais.total, proposta.locale, moeda),
  };
}

export async function montarHtmlProposta(app: FastifyInstance, proposalId: string) {
  const proposta = await app.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      template: true,
      client: true,
      assets: { orderBy: { position: 'asc' } },
      account: { select: { name: true, settingsJson: true, currentPlan: { select: { currency: true } } } },
    },
  });

  if (!proposta) {
    return null;
  }

  const fotos = await Promise.all(
    proposta.assets.map(async (asset) => ({
      url: await createDownloadUrl({ key: asset.s3ObjectKey, expiresIn: VALIDADE_FOTOS_SEGUNDOS }),
    })),
  );

  return renderProposalHtml(proposta.template.htmlBody, {
    ...(proposta.payloadJson as Payload),
    title: proposta.title,
    company: buscarEmpresa(proposta.account),
    client: proposta.client,
    assets: proposta.assets,
    photos: fotos,
    hasPhotos: fotos.length > 0,
    pricing: montarValores(proposta, moedaDaConta(proposta.account)),
  });
}
