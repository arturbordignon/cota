import type { FastifyInstance } from 'fastify';
import { createDownloadUrl } from '@crane/storage';

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

export function formatarMoeda(valor: number | undefined, locale: string) {
  let moeda = 'BRL';
  if (locale === 'en') {
    moeda = 'USD';
  }
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

function montarValores(proposta: { totalsJson: unknown; payloadJson: unknown; locale: string }) {
  const totais = proposta.totalsJson as Totais | null;
  const payload = proposta.payloadJson as Payload | null;
  if (!totais || typeof totais.total !== 'number') {
    return payload?.pricing;
  }

  return {
    ...payload?.pricing,
    mobilization: formatarMoeda(totais.mobilization, proposta.locale),
    dailyRate: formatarMoeda(totais.dailyRate, proposta.locale),
    days: totais.days,
    total: formatarMoeda(totais.total, proposta.locale),
  };
}

export async function montarHtmlProposta(app: FastifyInstance, proposalId: string) {
  const proposta = await app.prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      template: true,
      client: true,
      assets: { orderBy: { position: 'asc' } },
      account: { select: { name: true, settingsJson: true } },
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
    pricing: montarValores(proposta),
  });
}
