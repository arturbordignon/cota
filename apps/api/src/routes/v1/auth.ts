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

async function generateTokens(app: FastifyInstance, payload: TokenPayload) {
  const [accessToken, refreshToken] = await Promise.all([
    app.jwt.sign(payload, { expiresIn: '15m' }),
    (app.jwt.sign as any)(payload, {
      expiresIn: '7d',
      secret: env.JWT_REFRESH_SECRET,
    }),
  ]);
  return { accessToken, refreshToken };
}

const registerBodySchema = z.object({
  accountName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  locale: z.enum(['pt-BR', 'en']).default('pt-BR'),
});

const loginBodySchema = z.object({
  accountSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshBodySchema = z.object({
  refreshToken: z.string().min(1),
});

const authRoutes: FastifyPluginAsync = async (app) => {
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const payload = request.user;

    const user = await app.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        preferredLocale: true,
        department: { select: { id: true, name: true } },
        account: {
          select: {
            id: true,
            name: true,
            slug: true,
            defaultLocale: true,
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName ?? user.email,
        role: user.role,
        locale: user.preferredLocale,
        department: user.department
          ? {
              id: user.department.id,
              name: user.department.name,
            }
          : null,
      },
      account: {
        id: user.account.id,
        name: user.account.name,
        slug: user.account.slug,
        locale: user.account.defaultLocale,
      },
    };
  });

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

    const hashedPassword = await argon2.hash(body.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 15,
      timeCost: 2,
      parallelism: 1,
    });

    const result = await app.prisma.$transaction(async (tx) => {
      const account = await tx.account.create({
        data: {
          name: body.accountName,
          slug,
          defaultLocale: body.locale,
          settingsJson: { timezone: 'America/Sao_Paulo' },
        },
      });

      const user = await tx.user.create({
        data: {
          accountId: account.id,
          email: body.email.toLowerCase(),
          passwordHash: hashedPassword,
          role: 'OWNER',
          preferredLocale: body.locale,
        },
      });

      const planSlug = getDefaultPlanSlug(body.locale);
      const plan = await tx.plan.findUnique({ where: { slug: planSlug } });

      if (plan) {
        await tx.account.update({
          where: { id: account.id },
          data: { currentPlanId: plan.id },
        });

        await tx.subscription.create({
          data: {
            accountId: account.id,
            planId: plan.id,
            status: 'trialing',
          },
        });
      }

      return { account, user, plan };
    });

    const tokens = await generateTokens(app, {
      sub: result.user.id,
      accountId: result.account.id,
      role: result.user.role,
    });

    app.prisma.auditEvent
      .create({
        data: {
          accountId: result.account.id,
          userId: result.user.id,
          action: 'account.created',
          entityType: 'Account',
          entityId: result.account.id,
          summary: `Account ${result.account.name} created`,
          metadataJson: { locale, at: dayjs().toISOString() },
        },
      })
      .catch((err) => app.log.error({ err }, 'Failed to create audit log'));

    return reply.code(201).send({
      account: {
        id: result.account.id,
        name: result.account.name,
        slug: result.account.slug,
        locale: result.account.defaultLocale,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        locale: result.user.preferredLocale,
      },
      tokens,
      plan: result.plan
        ? {
            slug: result.plan.slug,
            name: result.plan.name,
            proposalsPerMonth: result.plan.proposalsPerMonth,
            isUnlimited: result.plan.isUnlimited,
          }
        : null,
      message: app.i18n.t('auth.welcome', { lng: locale }),
    });
  });

  app.post(
    '/login',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
          skipOnError: true,
          keyGenerator(request) {
            const ip = request.ip;
            const body = request.body as { accountSlug?: string } | undefined;
            const rawSlug = typeof body?.accountSlug === 'string' ? body.accountSlug : '';
            const normalizedSlug = toAccountSlug(rawSlug);
            return `${ip}:${normalizedSlug}`;
          },
        },
      },
    },
    async (request, reply) => {
      const start = Date.now();
      const body = loginBodySchema.parse(request.body);

      const accountSlug = toAccountSlug(body.accountSlug);
      if (!accountSlug) {
        return reply.status(401).send({ message: 'Invalid credentials' });
      }

      const user = await app.prisma.user.findFirst({
        where: {
          email: body.email.toLowerCase(),
          account: { slug: accountSlug },
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              slug: true,
              defaultLocale: true,
              currentPlan: {
                select: {
                  slug: true,
                  name: true,
                  proposalsPerMonth: true,
                  isUnlimited: true,
                },
              },
            },
          },
        },
      });

      if (!user || !user.isActive) {
        return reply.status(401).send({ message: 'Invalid credentials' });
      }

      const verifyStart = Date.now();
      const validPassword = await argon2.verify(user.passwordHash, body.password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 15,
        timeCost: 2,
        parallelism: 1,
      });
      app.log.info(`Argon2 verify took ${Date.now() - verifyStart}ms`);

      if (!validPassword) {
        return reply.status(401).send({ message: 'Invalid credentials' });
      }

      const auditMetadata: Record<string, unknown> = { at: dayjs().toISOString() };
      const auditData: Parameters<typeof app.prisma.auditEvent.create>[0]['data'] = {
        accountId: user.accountId,
        userId: user.id,
        action: 'auth.login',
        entityType: 'User',
        entityId: user.id,
        summary: `User ${user.email} logged in`,
        metadataJson: auditMetadata,
      };

      if (env.AUDIT_LOG_STORE_IP) {
        const userAgentHeader = request.headers['user-agent'];
        const userAgent = Array.isArray(userAgentHeader)
          ? userAgentHeader.join('; ').slice(0, 512)
          : (userAgentHeader ?? null);

        auditMetadata.ip = request.ip;
        auditMetadata.userAgent = userAgent;
        auditData.ipAddress = request.ip;
        auditData.userAgent = userAgent;
      }

      await app.prisma.$transaction([
        app.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        }),
        app.prisma.auditEvent.create({ data: auditData }),
      ]);

      const tokens = await generateTokens(app, {
        sub: user.id,
        accountId: user.accountId,
        role: user.role,
      });

      const locale = user.preferredLocale ?? user.account.defaultLocale;

      app.log.info(`Login total took ${Date.now() - start}ms`);

      return reply.send({
        tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          locale: user.preferredLocale,
        },
        account: {
          id: user.account.id,
          name: user.account.name,
          slug: user.account.slug,
          locale: user.account.defaultLocale,
        },
        plan: user.account.currentPlan
          ? {
              slug: user.account.currentPlan.slug,
              name: user.account.currentPlan.name,
              proposalsPerMonth: user.account.currentPlan.proposalsPerMonth,
              isUnlimited: user.account.currentPlan.isUnlimited,
            }
          : null,
        message: app.i18n.t('auth.welcome', { lng: locale }),
      });
    },
  );

  app.post('/refresh', async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);

    try {
      const payload = await (app.jwt.verify as any)(body.refreshToken, {
        secret: env.JWT_REFRESH_SECRET,
      });

      const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) {
        return reply.status(401).send({ message: 'Invalid refresh token' });
      }

      const tokens = await generateTokens(app, {
        sub: user.id,
        accountId: user.accountId,
        role: user.role,
      });

      return reply.send({ tokens });
    } catch (err) {
      request.log.error({ err }, 'Failed to refresh token');
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }
  });
};

export default authRoutes;
