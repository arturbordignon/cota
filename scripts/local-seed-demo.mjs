import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

if (existsSync('.env')) {
  const envFile = readFileSync('.env', 'utf8');
  for (const line of envFile.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^"|"$/g, '');
    process.env[key] ??= value;
  }
}

const requireFromDb = createRequire(new URL('../packages/db/package.json', import.meta.url));
const requireFromApi = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = requireFromDb('@prisma/client');
const argon2 = requireFromApi('argon2');
const prisma = new PrismaClient();

const demo = {
  accountName: 'Cota Demo',
  accountSlug: 'cota-demo',
  email: 'admin@cota.local',
  password: 'password123',
  locale: 'pt-BR',
};

async function main() {
  const passwordHash = await argon2.hash(demo.password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 15,
    timeCost: 2,
    parallelism: 1,
  });

  const plan = await prisma.plan.upsert({
    where: { slug: 'br-50' },
    create: {
      slug: 'br-50',
      name: 'Plano Essencial',
      currency: 'BRL',
      amountCents: 4990,
      proposalsPerMonth: 50,
      isUnlimited: false,
      isAnnual: false,
    },
    update: {},
  });

  const account = await prisma.account.upsert({
    where: { slug: demo.accountSlug },
    create: {
      name: demo.accountName,
      slug: demo.accountSlug,
      defaultLocale: demo.locale,
      settingsJson: { timezone: 'America/Sao_Paulo' },
      currentPlanId: plan.id,
    },
    update: {
      name: demo.accountName,
      defaultLocale: demo.locale,
      currentPlanId: plan.id,
    },
  });

  await prisma.user.upsert({
    where: {
      accountId_email: {
        accountId: account.id,
        email: demo.email,
      },
    },
    create: {
      accountId: account.id,
      email: demo.email,
      passwordHash,
      role: 'OWNER',
      preferredLocale: demo.locale,
      isActive: true,
    },
    update: {
      passwordHash,
      role: 'OWNER',
      preferredLocale: demo.locale,
      isActive: true,
    },
  });

  const subscription = await prisma.subscription.findFirst({
    where: {
      accountId: account.id,
      planId: plan.id,
      status: 'trialing',
    },
  });

  if (!subscription) {
    await prisma.subscription.create({
      data: {
        accountId: account.id,
        planId: plan.id,
        status: 'trialing',
      },
    });
  }

  console.log('Seeded demo login: cota-demo / admin@cota.local / password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
