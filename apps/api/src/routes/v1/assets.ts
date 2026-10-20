import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { customAlphabet } from 'nanoid';
import { createUploadUrl } from '@cota/storage';

import { exigirPermissao } from '../../utils/permissions.js';
import { EXTENSOES_DE_FOTO, TAMANHO_MAXIMO_FOTO, TIPOS_DE_FOTO, montarPrefixoFotos } from '../../utils/fotos.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

const uploadSchema = z.object({
  proposalId: z.string().uuid(),
  contentType: z.enum(TIPOS_DE_FOTO),
  size: z.number().int().positive().max(TAMANHO_MAXIMO_FOTO)
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

    const extensao = EXTENSOES_DE_FOTO[body.contentType];
    const key = `${montarPrefixoFotos(request.user.accountId, proposal.id)}${nanoid()}.${extensao}`;

    // The type and size are part of the signature, so the browser can't send
    // something else with this URL.
    const uploadUrl = await createUploadUrl({
      key,
      contentType: body.contentType,
      contentLength: body.size
    });

    return reply.send({
      key,
      uploadUrl
    });
  });
};

export default assetRoutes;
