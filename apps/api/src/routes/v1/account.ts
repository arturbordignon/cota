import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@cota/db';
import { apagarPrefixo } from '@cota/storage';

import { getStripe, isStripeEnabled } from '../../lib/stripe.js';
import { buscarEmpresa } from '../../services/proposal-render.js';
import { exigirPermissao } from '../../utils/permissions.js';
import { conferirSenha } from '../../utils/senhas.js';

const companySchema = z.object({
  name: z.string().trim().min(1),
  cnpj: z.string().trim().default(''),
  phone: z.string().trim().default(''),
  email: z.string().trim().default(''),
  address: z.string().trim().default(''),
  tagline: z.string().trim().default(''),
});

// What a new proposal starts with when the person doesn't say otherwise: the
// company's usual commercial terms, crew and validity. The proposal wizard and
// the assistant both fill these in, so they are typed once.
const linhas = (maximoPorLinha: number) => z.array(z.string().trim().min(1).max(maximoPorLinha)).max(30);

const proposalDefaultsSchema = z.object({
  terms: linhas(500).default([]),
  team: linhas(300).default([]),
  validityDays: z.number().int().min(1).max(365).nullable().default(null),
});

type PadroesDeProposta = z.infer<typeof proposalDefaultsSchema>;

function lerPadroes(configuracoes: unknown): PadroesDeProposta {
  const salvos = (configuracoes as { proposalDefaults?: unknown } | null)?.proposalDefaults;
  const lidos = proposalDefaultsSchema.safeParse(salvos ?? {});
  if (lidos.success) {
    return lidos.data;
  }
  return { terms: [], team: [], validityDays: null };
}

function lerConfiguracoes(valor: unknown): Prisma.JsonObject {
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    return valor as Prisma.JsonObject;
  }
  return {};
}

const excluirContaSchema = z.object({
  password: z.string().min(1),
  confirmSlug: z.string().min(1),
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

    const configuracoes = lerConfiguracoes(conta.settingsJson);

    await app.prisma.account.update({
      where: { id: request.user.accountId },
      data: { settingsJson: { ...configuracoes, company: body } },
    });

    return reply.send({ data: { company: body } });
  });

  app.get('/proposal-defaults', async (request, reply) => {
    const conta = await app.prisma.account.findUnique({
      where: { id: request.user.accountId },
      select: { settingsJson: true },
    });
    if (!conta) {
      return reply.status(404).send({ message: 'Account not found' });
    }
    return reply.send({ data: lerPadroes(conta.settingsJson) });
  });

  app.put('/proposal-defaults', { preHandler: exigirPermissao('templates', 'edit') }, async (request, reply) => {
    const body = proposalDefaultsSchema.parse(request.body);
    const conta = await app.prisma.account.findUnique({
      where: { id: request.user.accountId },
      select: { settingsJson: true },
    });
    if (!conta) {
      return reply.status(404).send({ message: 'Account not found' });
    }
    await app.prisma.account.update({
      where: { id: request.user.accountId },
      data: { settingsJson: { ...lerConfiguracoes(conta.settingsJson), proposalDefaults: body } },
    });
    return reply.send({ data: body });
  });

  // Right to erasure (LGPD/GDPR): the owner deletes the workspace and every
  // record, file and Stripe customer tied to it. Needs the password and the
  // workspace slug typed again so a stolen session alone can't do it.
  app.delete('/', { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } }, async (request, reply) => {
    if (request.user.role !== 'OWNER') {
      return reply.status(403).send({ message: 'Forbidden' });
    }

    const body = excluirContaSchema.parse(request.body);

    const conta = await app.prisma.account.findUnique({
      where: { id: request.user.accountId },
      select: { id: true, slug: true, stripeCustomerId: true },
    });
    if (!conta) {
      return reply.status(404).send({ message: 'Account not found' });
    }

    if (body.confirmSlug.trim() !== conta.slug) {
      return reply.status(400).send({ message: 'A confirmação não corresponde ao endereço do workspace.' });
    }

    const dono = await app.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { passwordHash: true },
    });
    if (!dono || !(await conferirSenha(dono.passwordHash, body.password))) {
      return reply.status(403).send({ message: 'Senha incorreta.' });
    }

    // Deleting the Stripe customer also cancels its subscriptions, so nobody
    // keeps being charged for a workspace that no longer exists.
    if (conta.stripeCustomerId && isStripeEnabled()) {
      try {
        await getStripe().customers.del(conta.stripeCustomerId);
      } catch (err) {
        const codigo = (err as { code?: string }).code;
        if (codigo !== 'resource_missing') {
          request.log.error({ err, accountId: conta.id }, 'Failed to delete the Stripe customer');
          return reply.status(502).send({ message: 'Não foi possível cancelar a assinatura. Tente novamente.' });
        }
      }
    }

    await apagarPrefixo(`accounts/${conta.id}/`);

    // Proposals go first: they reference templates and users with RESTRICT.
    await app.prisma.$transaction([
      app.prisma.proposal.deleteMany({ where: { accountId: conta.id } }),
      app.prisma.account.delete({ where: { id: conta.id } }),
    ]);

    request.log.info({ accountId: conta.id }, 'Account deleted at the owner request');
    return reply.status(204).send();
  });
};

export default accountRoutes;
