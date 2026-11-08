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

  // Shown in the header and footer of every proposal, so the demo looks like a
  // real company from the first PDF.
  const settingsJson = {
    timezone: 'America/Sao_Paulo',
    company: {
      name: 'Guindastes Horizonte Ltda',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 4002-8922',
      email: 'comercial@horizonte.com.br',
      address: 'Av. dos Estados, 4500 - Santo André/SP',
      tagline: 'Içamentos e remoções industriais com segurança.',
    },
  };

  const account = await prisma.account.upsert({
    where: { slug: demo.accountSlug },
    create: {
      name: demo.accountName,
      slug: demo.accountSlug,
      defaultLocale: demo.locale,
      settingsJson,
      currentPlanId: plan.id,
    },
    update: {
      name: demo.accountName,
      defaultLocale: demo.locale,
      currentPlanId: plan.id,
    },
  });

  // Keep details someone already edited on the account page.
  if (!account.settingsJson?.company) {
    await prisma.account.update({ where: { id: account.id }, data: { settingsJson } });
  }

  const owner = await prisma.user.upsert({
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
      fullName: 'Ana Ribeiro',
      jobTitle: 'Diretora comercial',
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

  // Sample data only goes into an empty account, so running the seed again
  // never duplicates it or touches what was created by hand.
  const clientes = await prisma.client.count({ where: { accountId: account.id } });
  if (clientes === 0) {
    await seedDemoData(account, owner);
    console.log('Added sample clients, services, proposals, pipeline and team.');
  }

  console.log('Seeded demo login: cota-demo / admin@cota.local / password123');
}

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(Date.now() - days * DAY);

async function seedDemoData(account, owner) {
  await seedClients(account);
}

async function seedClients(account) {
  const clients = [
    { name: 'Marcos Albuquerque', companyName: 'Construtora Atlântica S.A.', email: 'compras@atlantica.com.br', phone: '(11) 98810-2234', notes: 'Obras industriais na Grande SP. Prefere contato por e-mail.', days: 58 },
    { name: 'Fernanda Lima', companyName: 'Metalúrgica Vale Verde', email: 'fernanda.lima@valeverde.ind.br', phone: '(19) 99712-4410', notes: 'Paradas de manutenção trimestrais.', days: 41 },
    { name: 'Ricardo Teixeira', companyName: 'Porto Seco Campinas Logística', email: 'operacoes@portoseco.com.br', phone: '(19) 3241-8800', notes: 'Movimentação de contêineres e cargas de projeto.', days: 33 },
    { name: 'Juliana Prado', companyName: 'Energia Solar Paulista', email: 'juliana@energiasp.com.br', phone: '(11) 97455-1020', notes: 'Montagem de usinas solares no interior.', days: 19 },
    { name: 'Eduardo Santos', companyName: 'Galpões Modulares Brasil', email: 'eduardo@galpoesbr.com.br', phone: '(13) 99630-7781', notes: 'Estruturas metálicas para galpões logísticos.', days: 6 },
  ];
  for (const client of clients) {
    const { days, ...data } = client;
    await prisma.client.create({ data: { ...data, accountId: account.id, createdAt: daysAgo(days) } });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
