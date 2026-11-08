import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@cota/db';
import argon2 from 'argon2';
import dayjs from 'dayjs';
import env from '@cota/config';
import { toAccountSlug } from '../../utils/slug.js';
import { resolveLocale } from '../../utils/locale.js';
import { getDefaultPlanSlug } from '../../services/billing.js';
import { carregarPermissoes } from '../../utils/permissions.js';

type TokenPayload = {
  sub: string;
  accountId: string;
  role: string;
};

type RefreshPayload = TokenPayload & { tipo?: string; jti?: string };

const PREFIXO_REFRESH = 'cota:refresh:';
const VALIDADE_REFRESH_SEGUNDOS = 7 * 24 * 60 * 60;
// After a refresh the old token still works for a few seconds, so two tabs
// refreshing at the same time don't sign each other out.
const TOLERANCIA_ROTACAO_SEGUNDOS = 30;

function chaveRefresh(jti: string) {
  return `${PREFIXO_REFRESH}${jti}`;
}

// Every refresh token has an id kept in Redis. Using it rotates it, and signing
// out deletes it, so a leaked refresh token stops working.
async function generateTokens(app: FastifyInstance, payload: TokenPayload) {
  const jti = randomUUID();
  const [accessToken, refreshToken] = await Promise.all([
    app.jwt.sign(payload, { expiresIn: '15m' }),
    app.jwt.sign({ ...payload, tipo: 'refresh', jti }, {
      expiresIn: '7d',
      key: env.JWT_REFRESH_SECRET,
    }),
  ]);
  await app.redis.set(chaveRefresh(jti), payload.sub, 'EX', VALIDADE_REFRESH_SEGUNDOS);
  return { accessToken, refreshToken };
}

function lerRefreshToken(app: FastifyInstance, token: string) {
  try {
    const payload = app.jwt.verify<RefreshPayload>(token, { key: env.JWT_REFRESH_SECRET });
    if (payload.tipo !== 'refresh' || !payload.jti) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
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

const PARAMETROS_ARGON = {
  type: argon2.argon2id,
  memoryCost: 2 ** 15,
  timeCost: 2,
  parallelism: 1,
};

// Compared against when the user doesn't exist, so a wrong email takes as long
// as a wrong password and response times don't reveal who has an account.
const hashFicticio = argon2.hash(randomUUID(), PARAMETROS_ARGON);

const LIMITE_FALHAS_LOGIN = 10;
const JANELA_FALHAS_LOGIN_SEGUNDOS = 15 * 60;

// Counted per account and email, whatever the IP, so a botnet can't keep
// guessing one person's password by spreading the attempts.
function chaveFalhasLogin(accountSlug: string, email: string) {
  return `cota:login-falhas:${accountSlug}:${email}`;
}

async function registrarFalhaLogin(app: FastifyInstance, chave: string) {
  const falhas = await app.redis.incr(chave);
  if (falhas === 1) {
    await app.redis.expire(chave, JANELA_FALHAS_LOGIN_SEGUNDOS);
  }
}

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
      permissions: await carregarPermissoes(app, payload),
    };
  });

  app.post('/register', { config: { rateLimit: { max: 10, timeWindow: '1 hour' } } }, async (request, reply) => {
    const locale = resolveLocale(request);
    const body = registerBodySchema.parse(request.body);

    const slugBase = toAccountSlug(body.accountName);
    let slug = slugBase;
    let attempt = 1;
    while (await app.prisma.account.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${attempt}`;
      attempt += 1;
    }

    const hashedPassword = await argon2.hash(body.password, PARAMETROS_ARGON);

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
          metadataJson: {
            locale,
            at: dayjs().toISOString(),
            summaryKey: 'accountCreated',
            summaryParams: { account: result.account.name },
          },
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
      const email = body.email.toLowerCase();
      const chaveFalhas = chaveFalhasLogin(accountSlug, email);

      const falhas = Number(await app.redis.get(chaveFalhas));
      if (falhas >= LIMITE_FALHAS_LOGIN) {
        return reply.status(429).send({ message: 'Too many failed attempts. Try again in a few minutes.' });
      }

      const user = await app.prisma.user.findFirst({
        where: {
          email,
          account: { slug: accountSlug || '-' },
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

      let hashParaComparar = await hashFicticio;
      if (user?.isActive) {
        hashParaComparar = user.passwordHash;
      }

      const verifyStart = Date.now();
      const validPassword = await argon2.verify(hashParaComparar, body.password);
      app.log.info(`Argon2 verify took ${Date.now() - verifyStart}ms`);

      if (!user || !user.isActive || !validPassword) {
        await registrarFalhaLogin(app, chaveFalhas);
        return reply.status(401).send({ message: 'Invalid credentials' });
      }

      await app.redis.del(chaveFalhas);

      const auditMetadata: Prisma.JsonObject = {
        at: dayjs().toISOString(),
        summaryKey: 'login',
        summaryParams: { email: user.email },
      };
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

  app.post('/refresh', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);

    const payload = lerRefreshToken(app, body.refreshToken);
    if (!payload?.jti) {
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }

    const chave = chaveRefresh(payload.jti);
    const dono = await app.redis.get(chave);
    if (dono !== payload.sub) {
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }

    const restante = await app.redis.ttl(chave);
    if (restante > TOLERANCIA_ROTACAO_SEGUNDOS) {
      await app.redis.expire(chave, TOLERANCIA_ROTACAO_SEGUNDOS);
    }

    const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      await app.redis.del(chave);
      return reply.status(401).send({ message: 'Invalid refresh token' });
    }

    const tokens = await generateTokens(app, {
      sub: user.id,
      accountId: user.accountId,
      role: user.role,
    });

    return reply.send({ tokens });
  });

  app.post('/logout', { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } }, async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);

    const payload = lerRefreshToken(app, body.refreshToken);
    if (payload?.jti) {
      await app.redis.del(chaveRefresh(payload.jti));
    }

    return reply.status(204).send();
  });
};

export default authRoutes;
