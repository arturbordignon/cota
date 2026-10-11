import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { createUploadUrl } from '@crane/storage';
import { exigirPermissao } from '../../utils/permissions.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

const uploadSchema = z.object({
  proposalId: z.string().uuid(),
  contentType: z.string().min(1)
});

const assetRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', exigirPermissao('proposals'));

  app.post('/upload-url', async (request, reply) => {
    const body = uploadSchema.parse(request.body);

    const proposal = await app.prisma.proposal.findFirst({
      where: { id: body.proposalId, accountId: request.user.accountId },
      include: { assets: true }
    });

    if (!proposal) {
      return reply.status(404).send({ message: 'Proposal not found' });
    }

    if (proposal.assets.length >= 5) {
      return reply.status(400).send({ message: 'Maximum of 5 photos reached' });
    }

    const key = `accounts/${request.user.accountId}/proposals/${proposal.id}/photos/${nanoid()}`;

    const uploadUrl = await createUploadUrl({
      key,
      contentType: body.contentType
    });

    return reply.send({
      key,
      uploadUrl
    });
  });
};

export default assetRoutes;
