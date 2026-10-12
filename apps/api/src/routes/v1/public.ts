import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { createDownloadUrl } from '@cota/storage';

import { buscarEmpresa, formatarMoeda, montarHtmlProposta } from '../../services/proposal-render.js';
import { invalidateReportsOverviewCache, invalidateTeamRankingCache } from '../../utils/cache.js';

const STATUS_PUBLICOS = ['SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const;

const paramsSchema = z.object({ slug: z.string().min(1) });

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

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/proposals/:slug', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposta = await buscarPropostaPublica(app, params.slug);
    if (!proposta) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (!proposta.viewedAt) {
      await app.prisma.proposal.update({
        where: { id: proposta.id },
        data: { viewedAt: new Date() },
      });
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

  app.post('/proposals/:slug/accept', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposta = await buscarPropostaPublica(app, params.slug);
    if (!proposta) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (proposta.status !== 'SENT') {
      return reply.status(409).send({ message: 'Proposal can no longer be answered', status: proposta.status });
    }

    await app.prisma.proposal.update({
      where: { id: proposta.id },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    await Promise.all([
      invalidateReportsOverviewCache(app, proposta.accountId),
      invalidateTeamRankingCache(app, proposta.accountId),
    ]);

    return reply.send({ data: { status: 'ACCEPTED' } });
  });

  app.post('/proposals/:slug/decline', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposta = await buscarPropostaPublica(app, params.slug);
    if (!proposta) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (proposta.status !== 'SENT') {
      return reply.status(409).send({ message: 'Proposal can no longer be answered', status: proposta.status });
    }

    await app.prisma.proposal.update({
      where: { id: proposta.id },
      data: { status: 'DECLINED', declinedAt: new Date() },
    });

    await Promise.all([
      invalidateReportsOverviewCache(app, proposta.accountId),
      invalidateTeamRankingCache(app, proposta.accountId),
    ]);

    return reply.send({ data: { status: 'DECLINED' } });
  });
};

export default publicRoutes;
