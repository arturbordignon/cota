import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { toProposalSlug } from '../../utils/slug.js';
import { renderProposalHtml } from '../../utils/render.js';
import { resolveLocale } from '../../utils/locale.js';
import { ensureProposalCapacity, incrementProposalUsage } from '../../services/billing.js';
import { ProposalLimitError } from '../../errors/proposal-limit.js';

const createProposalSchema = z.object({
  templateId: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  title: z.string().optional(),
  locale: z.enum(['pt-BR', 'en']).optional(),
  payload: z.record(z.any()).default({}),
  totals: z.record(z.any()).default({}),
  expiresAt: z.string().datetime().optional()
});

const updateProposalSchema = z.object({
  title: z.string().optional(),
  locale: z.enum(['pt-BR', 'en']).optional(),
  payload: z.record(z.any()).optional(),
  totals: z.record(z.any()).optional(),
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

const proposalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

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
            totalsJson: body.totals,
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
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const proposal = await app.prisma.proposal.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId
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
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);
    const body = updateProposalSchema.parse(request.body);

    const proposal = await app.prisma.proposal.findFirst({
      where: { id: params.id, accountId: request.user.accountId },
      include: { assets: true }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    await app.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.locale ? { locale: body.locale } : {}),
        ...(body.payload ? { payloadJson: body.payload } : {}),
        ...(body.totals ? { totalsJson: body.totals } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.expiresAt ? { expiresAt: new Date(body.expiresAt) } : {})
      }
    });

    if (body.assets && body.assets.length > 0) {
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

    return reply.send({ data: updated });
  });

  app.post('/:id/generate', async (request, reply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const params = paramsSchema.parse(request.params);

    const proposal = await app.prisma.proposal.findFirst({
      where: {
        id: params.id,
        accountId: request.user.accountId
      },
      include: {
        template: true,
        assets: true,
        client: true
      }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    const locale = resolveLocale(request);

    const payloadData = (proposal.payloadJson ?? {}) as Record<string, unknown>;
    const html = renderProposalHtml(proposal.template.htmlBody, {
      ...payloadData,
      client: proposal.client,
      assets: proposal.assets
    });

    const outputKey = `proposals/${proposal.accountId}/${proposal.id}.pdf`;

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

    await app.prisma.proposal.update({
      where: { id: proposal.id },
      data: {
        status: 'PENDING'
      }
    });

    return reply.send({
      message: request.server.i18n.t('proposal.queued', { lng: locale }),
      pdfObjectKey: outputKey
    });
  });
};

export default proposalRoutes;
