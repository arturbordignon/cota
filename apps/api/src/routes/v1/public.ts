import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { notificarProposta, type Prisma } from '@cota/db';
import { createDownloadUrl } from '@cota/storage';

import { buscarEmpresa, formatarMoeda, montarHtmlProposta } from '../../services/proposal-render.js';
import { invalidateReportsOverviewCache, invalidateTeamRankingCache } from '../../utils/cache.js';

const STATUS_PUBLICOS = ['SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const;

const paramsSchema = z.object({ slug: z.string().min(1).max(200) });

const LIMITE_LEITURA = { rateLimit: { max: 60, timeWindow: '1 minute' } };
const LIMITE_RESPOSTA = { rateLimit: { max: 10, timeWindow: '1 minute' } };

async function buscarPropostaPublica(app: FastifyInstance, slug: string) {
  const proposta = await app.prisma.proposal.findFirst({
    where: { publicSlug: slug, status: { in: [...STATUS_PUBLICOS] } },
    include: {
      client: { select: { name: true, companyName: true } },
      account: { select: { name: true, settingsJson: true } },
    },
  });

  if (!proposta) {
    return null;
  }

  if (proposta.status !== 'SENT') {
    return proposta;
  }

  if (!proposta.expiresAt || proposta.expiresAt > new Date()) {
    return proposta;
  }

  return app.prisma.proposal.update({
    where: { id: proposta.id },
    data: { status: 'EXPIRED' },
    include: {
      client: { select: { name: true, companyName: true } },
      account: { select: { name: true, settingsJson: true } },
    },
  });
}

// Only a proposal still marked as sent changes, so a double click or an accept
// racing a decline records a single answer.
async function responderUmaVez(app: FastifyInstance, id: string, dados: Prisma.ProposalUpdateManyMutationInput) {
  const resultado = await app.prisma.proposal.updateMany({
    where: { id, status: 'SENT' },
    data: dados,
  });
  return resultado.count === 1;
}

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/proposals/:slug', { config: LIMITE_LEITURA }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposta = await buscarPropostaPublica(app, params.slug);
    if (!proposta) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (!proposta.viewedAt) {
      // Only the request that records the first view notifies, so reloads don't.
      const primeiraVez = await app.prisma.proposal.updateMany({
        where: { id: proposta.id, viewedAt: null },
        data: { viewedAt: new Date() },
      });
      if (primeiraVez.count === 1) {
        await notificarProposta(app.prisma, proposta.id, 'proposalViewed').catch((err) =>
          request.log.error({ err }, 'Failed to notify the proposal view'),
        );
      }
    }

    const html = await montarHtmlProposta(app, proposta.id);
    const totais = proposta.totalsJson as { total?: number } | null;

    let pdfUrl: string | null = null;
    if (proposta.pdfObjectKey) {
      pdfUrl = await createDownloadUrl({ key: proposta.pdfObjectKey });
    }

    return reply.send({
      data: {
        title: proposta.title,
        status: proposta.status,
        locale: proposta.locale,
        expiresAt: proposta.expiresAt,
        acceptedAt: proposta.acceptedAt,
        declinedAt: proposta.declinedAt,
        companyName: buscarEmpresa(proposta.account).name,
        clientName: proposta.client?.companyName || proposta.client?.name || null,
        total: formatarMoeda(totais?.total, proposta.locale),
        pdfUrl,
        html,
      },
    });
  });

  app.post('/proposals/:slug/accept', { config: LIMITE_RESPOSTA }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposta = await buscarPropostaPublica(app, params.slug);
    if (!proposta) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (proposta.status !== 'SENT') {
      return reply.status(409).send({ message: 'Proposal can no longer be answered', status: proposta.status });
    }

    const respondida = await responderUmaVez(app, proposta.id, { status: 'ACCEPTED', acceptedAt: new Date() });
    if (!respondida) {
      return reply.status(409).send({ message: 'Proposal can no longer be answered' });
    }

    await notificarProposta(app.prisma, proposta.id, 'proposalAccepted').catch((err) =>
      request.log.error({ err }, 'Failed to notify the proposal answer'),
    );

    await Promise.all([
      invalidateReportsOverviewCache(app, proposta.accountId),
      invalidateTeamRankingCache(app, proposta.accountId),
    ]);

    return reply.send({ data: { status: 'ACCEPTED' } });
  });

  app.post('/proposals/:slug/decline', { config: LIMITE_RESPOSTA }, async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposta = await buscarPropostaPublica(app, params.slug);
    if (!proposta) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (proposta.status !== 'SENT') {
      return reply.status(409).send({ message: 'Proposal can no longer be answered', status: proposta.status });
    }

    const respondida = await responderUmaVez(app, proposta.id, { status: 'DECLINED', declinedAt: new Date() });
    if (!respondida) {
      return reply.status(409).send({ message: 'Proposal can no longer be answered' });
    }

    await notificarProposta(app.prisma, proposta.id, 'proposalDeclined').catch((err) =>
      request.log.error({ err }, 'Failed to notify the proposal answer'),
    );

    await Promise.all([
      invalidateReportsOverviewCache(app, proposta.accountId),
      invalidateTeamRankingCache(app, proposta.accountId),
    ]);

    return reply.send({ data: { status: 'DECLINED' } });
  });
};

export default publicRoutes;
