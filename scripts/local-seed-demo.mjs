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

// --reset deletes the demo account first, so it comes back exactly as seeded
// (handy before recording a demo). Uploaded files of the old account stay in
// local storage under its old id; nothing points at them anymore.
async function resetDemoAccount() {
  const existing = await prisma.account.findUnique({ where: { slug: demo.accountSlug } });
  if (!existing) return;
  await prisma.$transaction([
    // Proposals go first: they reference templates and users with RESTRICT.
    prisma.proposal.deleteMany({ where: { accountId: existing.id } }),
    prisma.account.delete({ where: { id: existing.id } }),
  ]);
  console.log('Deleted the demo account to seed it again.');
}

async function main() {
  if (process.argv.includes('--reset')) {
    await resetDemoAccount();
  }

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
  await seedServices(account);
  const team = await seedTeam(account, owner);
  await seedProposals(account, owner, team);
  await seedPipeline(account);
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

async function seedServices(account) {
  const services = [
    { name: 'Guindaste todo-terreno 100 t', capacityTons: 100, dailyRate: 18750, description: 'Liebherr LTM 1100 com lança de 52 m e jib de 19 m.', notes: 'Inclui operador certificado.' },
    { name: 'Guindaste veicular 50 t', capacityTons: 50, dailyRate: 9800, description: 'Lança telescópica de 40 m, ideal para obras urbanas.' },
    { name: 'Caminhão munck 30 t', capacityTons: 30, dailyRate: 4200, description: 'Apoio logístico e movimentação de acessórios.' },
    { name: 'Plataforma elevatória 20 m', dailyRate: 1600, description: 'Plataforma articulada a diesel para trabalho em altura.' },
  ];
  for (const service of services) {
    const { description, notes, ...data } = service;
    const specs = {};
    if (description) specs.description = description;
    if (notes) specs.notes = notes;
    await prisma.equipment.create({ data: { ...data, accountId: account.id, specsJson: specs } });
  }
}

const CRANE_TEMPLATE_ID = 'a3a92568-5d5f-4de8-9f7c-6f9b4a0e9d3f';

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function seedProposals(account, owner, team = {}) {
  // The crane template is created by the API on startup, which runs before the seed.
  const template = await prisma.proposalTemplate.findUnique({ where: { id: CRANE_TEMPLATE_ID } });
  if (!template) {
    console.warn('Crane template not found: start the API once before seeding proposals.');
    return;
  }
  const clients = await prisma.client.findMany({ where: { accountId: account.id } });
  const client = (company) => clients.find((item) => item.companyName === company);

  const proposals = [
    { title: 'Montagem de estrutura metálica - Galpão 3', company: 'Galpões Modulares Brasil', site: 'Cajamar, SP', schedule: '03/11 a 07/11', mobilization: 12800, dailyRate: 18750, days: 5, status: 'ACCEPTED', created: 14, sent: 13, viewed: 12, answered: 10, equipment: 'Guindaste todo-terreno 100 t', scope: ['Içamento e posicionamento de treliças de até 48 m.', 'Supervisor técnico durante todo o turno.'] },
    { author: 'bruno', title: 'Parada de manutenção - Forno 2', company: 'Metalúrgica Vale Verde', site: 'Sumaré, SP', schedule: '14/10 a 16/10', mobilization: 6000, dailyRate: 9800, days: 3, status: 'ACCEPTED', created: 30, sent: 29, viewed: 27, answered: 25, equipment: 'Guindaste veicular 50 t', scope: ['Remoção e reinstalação da tampa do forno.', 'Movimentação de refratários.'] },
    { title: 'Içamento de transformador 15 MVA', company: 'Energia Solar Paulista', site: 'Itapetininga, SP', schedule: '20/11 a 21/11', mobilization: 8500, dailyRate: 18750, days: 2, status: 'SENT', created: 4, sent: 3, viewed: 2, equipment: 'Guindaste todo-terreno 100 t', scope: ['Içamento do transformador da carreta até a base.', 'Plano de rigging com ART.'] },
    { author: 'larissa', title: 'Movimentação de cargas de projeto', company: 'Porto Seco Campinas Logística', site: 'Campinas, SP', schedule: '25/11 a 30/11', mobilization: 4000, dailyRate: 4200, days: 6, status: 'SENT', created: 2, sent: 1, equipment: 'Caminhão munck 30 t', scope: ['Descarga e posicionamento de equipamentos importados.'] },
    { author: 'bruno', title: 'Remoção de prensa hidráulica', company: 'Construtora Atlântica S.A.', site: 'São Bernardo do Campo, SP', schedule: '22/10 a 23/10', mobilization: 5000, dailyRate: 9800, days: 2, status: 'DECLINED', created: 20, sent: 19, viewed: 18, answered: 15, equipment: 'Guindaste veicular 50 t', scope: ['Desmontagem e remoção da prensa para a área externa.'] },
    { title: 'Içamento de vigas - Ponte rolante', company: 'Construtora Atlântica S.A.', site: 'Guarulhos, SP', schedule: '29/09 a 30/09', mobilization: 4500, dailyRate: 9800, days: 2, status: 'EXPIRED', created: 45, sent: 44, viewed: 43, equipment: 'Guindaste veicular 50 t', scope: ['Içamento das vigas da ponte rolante.'] },
    { title: 'Montagem de usina solar - Etapa 2', company: 'Energia Solar Paulista', site: 'Itapetininga, SP', schedule: 'A partir de 02/12', mobilization: 3000, dailyRate: 1600, days: 10, status: 'DRAFT', created: 0, equipment: 'Plataforma elevatória 20 m', scope: ['Apoio à montagem das estruturas dos painéis.'] },
  ];

  const base = template.defaultDataJson ?? {};
  const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const periodEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999);
  let usedThisMonth = 0;

  for (const item of proposals) {
    const total = item.mobilization + item.dailyRate * item.days;
    const createdAt = daysAgo(item.created);
    const at = (days) => (days === undefined ? null : daysAgo(days));
    const proposal = await prisma.proposal.create({
      data: {
        accountId: account.id,
        templateId: template.id,
        clientId: client(item.company)?.id,
        createdById: (team[item.author] ?? owner).id,
        title: item.title,
        locale: 'pt-BR',
        status: item.status,
        publicSlug: `${slugify(item.title)}-${Math.random().toString(36).slice(2, 8)}`,
        payloadJson: {
          ...base,
          job: { projectName: item.title, siteLocation: item.site, schedule: item.schedule, scope: item.scope },
          equipment: [{ name: item.equipment, capacity: '', reach: '', notes: '' }],
          pricing: { validity: 'Valores válidos por 15 dias corridos.' },
        },
        totalsJson: { mobilization: item.mobilization, dailyRate: item.dailyRate, days: item.days, total },
        createdAt,
        sentAt: at(item.sent),
        viewedAt: at(item.viewed),
        acceptedAt: item.status === 'ACCEPTED' ? at(item.answered) : null,
        declinedAt: item.status === 'DECLINED' ? at(item.answered) : null,
        expiresAt: item.status === 'EXPIRED' ? daysAgo(item.created - 15) : new Date(createdAt.getTime() + 15 * DAY),
      },
    });
    if (createdAt >= periodStart) usedThisMonth += 1;

    // What the activity log and the bell would have recorded for this proposal.
    const author = (team[item.author] ?? owner).id;
    const events = [{ action: 'proposal.created', key: 'proposalCreated', when: createdAt, userId: author }];
    if (item.sent !== undefined) events.push({ action: 'proposal.sent', key: 'proposalSent', when: at(item.sent), userId: author });
    if (item.status === 'ACCEPTED') events.push({ action: 'proposal.accepted', key: 'proposalAccepted', when: at(item.answered), userId: null });
    if (item.status === 'DECLINED') events.push({ action: 'proposal.declined', key: 'proposalDeclined', when: at(item.answered), userId: null });
    for (const event of events) {
      await prisma.auditEvent.create({
        data: {
          accountId: account.id,
          userId: event.userId,
          action: event.action,
          entityType: 'Proposal',
          entityId: proposal.id,
          summary: `${event.action} ${item.title}`,
          metadataJson: { summaryKey: event.key, summaryParams: { proposal: item.title } },
          createdAt: event.when,
        },
      });
    }

    const notices = [];
    if (item.viewed !== undefined) notices.push({ key: 'proposalViewed', tone: 'INFO', when: at(item.viewed), title: 'Proposta visualizada', body: `O cliente abriu a proposta ${item.title}.` });
    if (item.status === 'ACCEPTED') notices.push({ key: 'proposalAccepted', tone: 'SUCCESS', when: at(item.answered), title: 'Proposta aceita', body: `O cliente aceitou a proposta ${item.title}.` });
    if (item.status === 'DECLINED') notices.push({ key: 'proposalDeclined', tone: 'WARNING', when: at(item.answered), title: 'Proposta recusada', body: `O cliente recusou a proposta ${item.title}.` });
    for (const notice of notices) {
      await prisma.notification.create({
        data: {
          accountId: account.id,
          recipientId: owner.id,
          title: notice.title,
          body: notice.body,
          tone: notice.tone,
          // Older news is already read; the last few days stay unread.
          isRead: notice.when < daysAgo(3),
          metadataJson: { key: notice.key, params: { proposal: item.title }, link: `/proposals/${proposal.publicSlug}` },
          createdAt: notice.when,
        },
      });
    }
  }

  const usage = await prisma.proposalUsage.findFirst({ where: { accountId: account.id, periodStart, periodEnd } });
  if (usage) {
    await prisma.proposalUsage.update({ where: { id: usage.id }, data: { proposalsUsed: { increment: usedThisMonth } } });
  } else {
    await prisma.proposalUsage.create({ data: { accountId: account.id, periodStart, periodEnd, proposalsUsed: usedThisMonth } });
  }
}

async function seedPipeline(account) {
  if ((await prisma.pipelineStage.count({ where: { accountId: account.id } })) > 0) {
    return;
  }
  const stages = [
    { name: 'Descoberta', color: 'info', leads: [
      { companyName: 'Fertilizantes Cerrado', contactName: 'Paulo Mendes', contactEmail: 'paulo@cerrado.agr.br', estimatedValue: 38000, notes: 'Troca de silos em fevereiro.' },
      { companyName: 'Hospital Santa Clara', contactName: 'Renata Dias', estimatedValue: 12000, notes: 'Içamento de chillers na cobertura.' },
    ] },
    { name: 'Qualificação', color: 'warning', leads: [
      { companyName: 'Usina Bom Retiro', contactName: 'Carlos Moura', contactEmail: 'carlos@bomretiro.com.br', estimatedValue: 95000, notes: 'Parada anual da moenda.' },
    ] },
    { name: 'Proposta enviada', color: 'info', leads: [
      { companyName: 'Energia Solar Paulista', contactName: 'Juliana Prado', contactEmail: 'juliana@energiasp.com.br', estimatedValue: 46000, notes: 'Transformador 15 MVA.' },
      { companyName: 'Porto Seco Campinas Logística', contactName: 'Ricardo Teixeira', estimatedValue: 29200 },
    ] },
    { name: 'Fechado', color: 'success', leads: [
      { companyName: 'Galpões Modulares Brasil', contactName: 'Eduardo Santos', estimatedValue: 106550, notes: 'Galpão 3 aprovado.' },
    ] },
  ];
  for (const [position, stage] of stages.entries()) {
    const created = await prisma.pipelineStage.create({
      data: { accountId: account.id, name: stage.name, color: stage.color, position },
    });
    for (const lead of stage.leads) {
      await prisma.pipelineLead.create({ data: { ...lead, accountId: account.id, stageId: created.id } });
    }
  }
}

const MODULES = ['DASHBOARD', 'PROPOSALS', 'TEMPLATES', 'CRM', 'REPORTS', 'PLAN', 'CLIENTS', 'SERVICES'];

async function seedTeam(account, owner) {
  // Sales can create proposals, clients and leads; operations only looks.
  const sales = await prisma.department.create({
    data: {
      accountId: account.id,
      name: 'Comercial',
      slug: 'comercial',
      description: 'Vendedores que montam e enviam as propostas.',
      permissionPreset: 'CUSTOM',
      permissions: {
        create: MODULES.map((module) => ({
          module,
          canView: module !== 'PLAN',
          canEdit: ['PROPOSALS', 'CRM', 'CLIENTS'].includes(module),
        })),
      },
    },
  });
  const operations = await prisma.department.create({
    data: {
      accountId: account.id,
      name: 'Operações',
      slug: 'operacoes',
      description: 'Equipe de campo que acompanha as operações.',
      permissionPreset: 'VIEW',
      permissions: { create: MODULES.map((module) => ({ module, canView: true, canEdit: false })) },
    },
  });

  const passwordHash = await argon2.hash(demo.password, { type: argon2.argon2id, memoryCost: 2 ** 15, timeCost: 2, parallelism: 1 });
  const member = (data) =>
    prisma.user.create({
      data: { accountId: account.id, role: 'MEMBER', preferredLocale: 'pt-BR', invitedById: owner.id, passwordHash, ...data },
    });

  const bruno = await member({ email: 'bruno@cota.local', fullName: 'Bruno Carvalho', jobTitle: 'Vendedor', departmentId: sales.id, isActive: true, acceptedAt: daysAgo(50) });
  const larissa = await member({ email: 'larissa@cota.local', fullName: 'Larissa Souza', jobTitle: 'Coordenadora de operações', departmentId: operations.id, isActive: true, acceptedAt: daysAgo(35) });
  // Still pending: shows the "invite pending" state with a link to share.
  await member({ email: 'diego@cota.local', fullName: 'Diego Martins', jobTitle: 'Vendedor', departmentId: sales.id, isActive: false, invitedAt: daysAgo(2) });

  return { bruno, larissa };
}
