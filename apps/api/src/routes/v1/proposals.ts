import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@crane/db';
import { createDownloadUrl } from '@crane/storage';

import { toProposalSlug } from '../../utils/slug.js';
import { resolveLocale } from '../../utils/locale.js';
import { exigirPermissao } from '../../utils/permissions.js';
import { montarHtmlProposta } from '../../services/proposal-render.js';
import { ensureProposalCapacity, incrementProposalUsage } from '../../services/billing.js';
import { ProposalLimitError } from '../../errors/proposal-limit.js';
import { invalidateReportsOverviewCache, invalidateTeamRankingCache } from '../../utils/cache.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_REGEX.test(value);

const totalsSchema = z.object({
  mobilization: z.number().min(0).default(0),
  dailyRate: z.number().min(0).default(0),
  days: z.number().int().min(0).default(0),
});

const createProposalSchema = z.object({
  templateId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  title: z.string().optional(),
  locale: z.enum(['pt-BR', 'en']).optional(),
  payload: z.record(z.any()).default({}),
  totals: totalsSchema.default({}),
  expiresAt: z.string().datetime().optional()
});

const updateProposalSchema = z.object({
  title: z.string().optional(),
  locale: z.enum(['pt-BR', 'en']).optional(),
  payload: z.record(z.any()).optional(),
  totals: totalsSchema.optional(),
  status: z.enum(['DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
  expiresAt: z.string().datetime().optional(),
  assets: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        s3ObjectKey: z.string().min(1),
        mimeType: z.string().min(1),
        position: z.number().int().min(0)
      })
    )
    .max(5)
    .optional()
});

const listQuerySchema = z.object({
  status: z.enum(['DRAFT', 'PENDING', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
  clientId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional()
});

const paramsSchema = z.object({ id: z.string().min(1) });

function calcularTotais(valores: z.infer<typeof totalsSchema>) {
  const total = valores.mobilization + valores.dailyRate * valores.days;
  return { ...valores, total: Math.round(total * 100) / 100 };
}

function montarFiltroProposta(accountId: string, identificador: string) {
  if (isUuid(identificador)) {
    return { accountId, id: identificador };
  }
  return { accountId, publicSlug: identificador };
}

async function clientePertenceConta(request: FastifyRequest, clientId?: string) {
  if (!clientId) {
    return true;
  }
  const cliente = await request.server.prisma.client.findFirst({
    where: { id: clientId, accountId: request.user.accountId },
    select: { id: true },
  });
  if (!cliente) {
    return false;
  }
  return true;
}

const proposalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', exigirPermissao('proposals'));

  app.get('/', async (request, reply) => {
    const query = listQuerySchema.parse(request.query);

    const proposals = await app.prisma.proposal.findMany({
      where: {
        accountId: request.user.accountId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined
              }
            }
          : {})
      },
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        template: {
          select: { id: true, name: true }
        }
      }
    });

    return reply.send({ data: proposals });
  });

  app.post('/', async (request, reply) => {
    const body = createProposalSchema.parse(request.body);
    const locale = resolveLocale(request);

    if (!(await clientePertenceConta(request, body.clientId))) {
      return reply.status(404).send({ message: 'Client not found' });
    }

    const template = await app.prisma.proposalTemplate.findFirst({
      where: {
        id: body.templateId,
        OR: [
          { accountId: request.user.accountId },
          { accountId: null }
        ],
        isActive: true
      }
    });

    if (!template) {
      return reply.status(404).send({ message: 'Template not found' });
    }

    const payload = {
      ...(template.defaultDataJson as Record<string, unknown>),
      ...body.payload
    };

    try {
      const proposal = await app.prisma.$transaction(async (tx) => {
        await ensureProposalCapacity(tx, request.user.accountId);

        const created = await tx.proposal.create({
          data: {
            accountId: request.user.accountId,
            templateId: template.id,
            clientId: body.clientId,
            createdById: request.user.sub,
            title: body.title ?? template.name,
            locale: body.locale ?? template.locale,
            status: 'DRAFT',
            payloadJson: payload,
            totalsJson: calcularTotais(body.totals),
            publicSlug: toProposalSlug(body.title ?? template.name),
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined
          },
          include: {
            client: true,
            template: {
              select: { id: true, name: true }
            }
          }
        });

        await incrementProposalUsage(tx, request.user.accountId);
        return created;
      });

      await Promise.all([
        invalidateReportsOverviewCache(app, request.user.accountId),
        invalidateTeamRankingCache(app, request.user.accountId),
      ]);

      return reply.code(201).send({
        data: proposal,
        message: request.server.i18n.t('proposal.created', { lng: locale })
      });
    } catch (error) {
      if (error instanceof ProposalLimitError) {
        return reply.status(402).send({ message: error.message, code: 'PROPOSAL_LIMIT_REACHED' });
      }
      throw error;
    }
  });

  app.get('/:id', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const identifier = params.id;

    const proposal = await app.prisma.proposal.findFirst({
      where: {
        accountId: request.user.accountId,
        ...(isUuid(identifier) ? { id: identifier } : { publicSlug: identifier })
      },
      include: {
        client: true,
        template: true,
        assets: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    return reply.send({ data: proposal });
  });

  app.patch('/:id', async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const body = updateProposalSchema.parse(request.body);

    const proposal = await app.prisma.proposal.findFirst({
      where: montarFiltroProposta(request.user.accountId, params.id),
      include: { assets: true }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    const prefixoFotos = `accounts/${request.user.accountId}/proposals/${proposal.id}/`;
    if (body.assets && body.assets.some((asset) => !asset.s3ObjectKey.startsWith(prefixoFotos))) {
      return reply.status(400).send({ message: 'Invalid asset key' });
    }

    const dados: Prisma.ProposalUpdateInput = {};
    if (body.title) {
      dados.title = body.title;
    }
    if (body.locale) {
      dados.locale = body.locale;
    }
    if (body.payload) {
      dados.payloadJson = body.payload;
    }
    if (body.totals) {
      dados.totalsJson = calcularTotais(body.totals);
    }
    if (body.status) {
      dados.status = body.status;
    }
    if (body.expiresAt) {
      dados.expiresAt = new Date(body.expiresAt);
    }

    await app.prisma.proposal.update({
      where: { id: proposal.id },
      data: dados
    });

    if (body.assets) {
      const limitedAssets = body.assets.slice(0, 5);
      await app.prisma.$transaction(async (tx) => {
        await tx.proposalAsset.deleteMany({ where: { proposalId: proposal.id } });
        await tx.proposalAsset.createMany({
          data: limitedAssets.map((asset) => ({
            accountId: request.user.accountId,
            proposalId: proposal.id,
            s3ObjectKey: asset.s3ObjectKey,
            mimeType: asset.mimeType,
            position: asset.position
          }))
        });
      });
    }

    const updated = await app.prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: {
        client: true,
        template: true,
        assets: {
          orderBy: { position: 'asc' }
        }
      }
    });

    await Promise.all([
      invalidateReportsOverviewCache(app, request.user.accountId),
      invalidateTeamRankingCache(app, request.user.accountId),
    ]);

    return reply.send({ data: updated });
  });

  app.post('/:id/generate', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposal = await app.prisma.proposal.findFirst({
      where: montarFiltroProposta(request.user.accountId, params.id),
      select: { id: true, accountId: true, locale: true }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    const locale = resolveLocale(request);
    const html = await montarHtmlProposta(app, proposal.id);
    if (!html) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    const outputKey = `accounts/${proposal.accountId}/proposals/${proposal.id}/proposta.pdf`;

    await app.pdfQueue.add(
      'generate',
      {
        proposalId: proposal.id,
        html,
        locale: proposal.locale,
        outputKey
      },
      {
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    return reply.send({
      message: request.server.i18n.t('proposal.queued', { lng: locale }),
      pdfObjectKey: outputKey
    });
  });

  app.post('/:id/send', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposal = await app.prisma.proposal.findFirst({
      where: montarFiltroProposta(request.user.accountId, params.id),
      select: { id: true, status: true }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (proposal.status !== 'DRAFT' && proposal.status !== 'PENDING') {
      return reply.send({ data: proposal });
    }

    const updated = await app.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'SENT', sentAt: new Date() },
      select: { id: true, status: true }
    });

    await Promise.all([
      invalidateReportsOverviewCache(app, request.user.accountId),
      invalidateTeamRankingCache(app, request.user.accountId),
    ]);

    return reply.send({ data: updated });
  });

  app.get('/:id/pdf', async (request, reply) => {
    const params = paramsSchema.parse(request.params);

    const proposal = await app.prisma.proposal.findFirst({
      where: montarFiltroProposta(request.user.accountId, params.id),
      select: { pdfObjectKey: true }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (!proposal.pdfObjectKey) {
      return reply.status(404).send({ message: 'PDF not generated yet' });
    }

    const url = await createDownloadUrl({ key: proposal.pdfObjectKey });
    return reply.send({ url });
  });
};

export default proposalRoutes;
