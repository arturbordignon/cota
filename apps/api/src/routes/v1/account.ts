import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@cota/db';

import { buscarEmpresa } from '../../services/proposal-render.js';

const companySchema = z.object({
  name: z.string().trim().min(1),
  cnpj: z.string().trim().default(''),
  phone: z.string().trim().default(''),
  email: z.string().trim().default(''),
  address: z.string().trim().default(''),
  tagline: z.string().trim().default(''),
});

const accountRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', app.authenticate);

  app.get('/', async (request, reply) => {
    const conta = await app.prisma.account.findUnique({
      where: { id: request.user.accountId },
      select: { id: true, name: true, slug: true, settingsJson: true },
    });

    if (!conta) {
      return reply.status(404).send({ message: 'Account not found' });
    }

    return reply.send({
      data: {
        id: conta.id,
        name: conta.name,
        slug: conta.slug,
        company: buscarEmpresa(conta),
      },
    });
  });

  app.put('/company', async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const body = companySchema.parse(request.body);

    const conta = await app.prisma.account.findUnique({
      where: { id: request.user.accountId },
      select: { settingsJson: true },
    });

    if (!conta) {
      return reply.status(404).send({ message: 'Account not found' });
    }

    let configuracoes: Prisma.JsonObject = {};
    if (conta.settingsJson && typeof conta.settingsJson === 'object') {
      configuracoes = conta.settingsJson as Prisma.JsonObject;
    }

    await app.prisma.account.update({
      where: { id: request.user.accountId },
      data: { settingsJson: { ...configuracoes, company: body } },
    });

    return reply.send({ data: { company: body } });
  });
};

export default accountRoutes;
