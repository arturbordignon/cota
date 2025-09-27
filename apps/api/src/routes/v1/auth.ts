import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import dayjs from 'dayjs';
import env from '@crane/config';
import { toAccountSlug } from '../../utils/slug.js';
import { resolveLocale } from '../../utils/locale.js';
import { getDefaultPlanSlug } from '../../services/billing.js';

type TokenPayload = {
  sub: string;
  accountId: string;
  role: string;
};

function generateTokens(app: FastifyInstance, payload: TokenPayload) {
  const accessToken = app.jwt.sign(payload, { expiresIn: '15m' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const refreshToken = (app.jwt.sign as any)(payload, {
    expiresIn: '7d',
    secret: env.JWT_REFRESH_SECRET
  });
  return { accessToken, refreshToken };
}

const registerBodySchema = z.object({
  accountName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  locale: z.enum(['pt-BR', 'en']).default('pt-BR')
});

const loginBodySchema = z.object({
  accountSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1)
});

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', async (request, reply) => {
    const locale = resolveLocale(request);
    const body = registerBodySchema.parse(request.body);

    const slugBase = toAccountSlug(body.accountName);
    let slug = slugBase;
    let attempt = 1;
    while (await app.prisma.account.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${attempt}`;
      attempt += 1;
    }

    const hashedPassword = await argon2.hash(body.password);

    const result = await app.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: body.accountName,
          slug,
          defaultLocale: body.locale,
          settingsJson: { timezone: 'America/Sao_Paulo' }
        }
      });

      const user = await tx.user.create({
        data: {
          accountId: account.id,
          email: body.email.toLowerCase(),
          passwordHash: hashedPassword,
          role: 'OWNER',
          preferredLocale: body.locale
        }
      });

      const planSlug = getDefaultPlanSlug(body.locale);
      const plan = await tx.plan.findUnique({ where: { slug: planSlug } });

      if (plan) {
        await tx.account.update({
          where: { id: account.id },
          data: { currentPlanId: plan.id }
        });

        await tx.subscription.create({
          data: {
            accountId: account.id,
            planId: plan.id,
            status: 'trialing'
          }
        });
      }

      return { account, user, plan };
    });

    const tokens = generateTokens(app, {
      sub: result.user.id,
      accountId: result.account.id,
      role: result.user.role
    });

    await app.prisma.auditEvent.create({
      data: {
        accountId: result.account.id,
        userId: result.user.id,
        action: 'account.created',
        entityType: 'Account',
        entityId: result.account.id,
        metadataJson: {
          locale,
          at: dayjs().toISOString()
        }
      }
    });

    return reply.code(201).send({
      account: {
        id: result.account.id,
        name: result.account.name,
        slug: result.account.slug,
        locale: result.account.defaultLocale
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        locale: result.user.preferredLocale
      },
      tokens,
      plan: result.plan
        ? {
            slug: result.plan.slug,
            name: result.plan.name,
            proposalsPerMonth: result.plan.proposalsPerMonth,
            isUnlimited: result.plan.isUnlimited
          }
        : null,
      message: app.i18n.t('auth.welcome', { lng: locale })
    });
  });

  app.post('/login', async (request, reply) => {
    const body = loginBodySchema.parse(request.body);

    const user = await app.prisma.user.findFirst({
      where: {
        email: body.email.toLowerCase(),
        account: {
          slug: body.accountSlug
        }
      }
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const validPassword = await argon2.verify(user.passwordHash, body.password);
    if (!validPassword) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    await app.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const tokens = generateTokens(app, {
      sub: user.id,
      accountId: user.accountId,
      role: user.role
    });

    return reply.send({
      tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        locale: user.preferredLocale
      },
      message: app.i18n.t('auth.welcome', { lng: user.preferredLocale })
    });
  });

  app.post('/refresh', async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = await (app.jwt.verify as any)(body.refreshToken, {
        secret: env.JWT_REFRESH_SECRET
      });

      const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        return reply.status(401).send({ message: 'Invalid refresh token' });
      }

      const tokens = generateTokens(app, {
        sub: user.id,
        accountId: user.accountId,
        role: user.role
      });

      return reply.send({ tokens });
    } catch (err) {
      request.log.error({ err }, 'Failed to refresh token');
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }
  });
};

export default authRoutes;
