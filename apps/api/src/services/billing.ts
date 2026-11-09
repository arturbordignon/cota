import dayjs from 'dayjs';
import { Prisma, PrismaClient } from '@cota/db';

import { ProposalLimitError } from '../errors/proposal-limit.js';

export const TRIAL_DAYS = 14;
export const TRIAL_PROPOSALS = 10;

type Cliente = Prisma.TransactionClient | PrismaClient;

interface PeriodRange {
  start: Date;
  end: Date;
}

function getCurrentPeriodRange(): PeriodRange {
  const start = dayjs().startOf('month');
  const end = dayjs().endOf('month');
  return { start: start.toDate(), end: end.toDate() };
}

export function getTrialPlanSlug(locale: string) {
  return locale.startsWith('en') ? 'us-trial' : 'br-trial';
}

// The trial is the subscription with no Stripe id that new accounts get. Its
// currentPeriodEnd is the last moment proposals can be created on it.
export async function buscarTeste(prisma: Cliente, accountId: string) {
  const assinatura = await prisma.subscription.findFirst({
    where: { accountId, status: 'trialing', stripeSubscriptionId: null },
    orderBy: { createdAt: 'desc' },
    select: { currentPeriodEnd: true },
  });
  const fim = assinatura?.currentPeriodEnd ?? null;
  let inicio: Date | null = null;
  if (fim) {
    inicio = dayjs(fim).subtract(TRIAL_DAYS, 'day').toDate();
  }
  return { inicio, fim, terminou: !fim || fim.getTime() <= Date.now() };
}

// A trial that starts near the end of a month runs into the next one, so what
// was used of it last month comes off what is left this month.
async function usoAnteriorNoTeste(tx: Cliente, accountId: string, inicio: Date, period: PeriodRange) {
  const anteriores = await tx.proposalUsage.findMany({
    where: { accountId, periodStart: { lt: period.start }, periodEnd: { gte: inicio } },
    select: { proposalsUsed: true },
  });
  return anteriores.reduce((soma, linha) => soma + linha.proposalsUsed, 0);
}

// Uses one row per account and month. The reservation is a single conditional
// UPDATE, so concurrent requests can't both take the last slot or lose a count.
export async function reserveProposalSlot(tx: Prisma.TransactionClient, accountId: string) {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    include: { currentPlan: true },
  });

  if (!account) {
    throw new Error('Conta não encontrada.');
  }

  const period = getCurrentPeriodRange();
  const plan = account.currentPlan;

  let limite: number | null = null;
  if (plan && !plan.isUnlimited && plan.proposalsPerMonth != null) {
    limite = plan.proposalsPerMonth;
  }

  if (plan?.isTrial) {
    const teste = await buscarTeste(tx, accountId);
    if (teste.terminou || !teste.inicio) {
      throw new ProposalLimitError('TRIAL_ENDED', limite);
    }
    limite = (limite ?? TRIAL_PROPOSALS) - (await usoAnteriorNoTeste(tx, accountId, teste.inicio, period));
  }

  await tx.proposalUsage.createMany({
    data: [{ accountId, periodStart: period.start, periodEnd: period.end }],
    skipDuplicates: true,
  });

  const where: Prisma.ProposalUsageWhereInput = {
    accountId,
    periodStart: period.start,
    periodEnd: period.end,
  };
  if (limite !== null) {
    where.proposalsUsed = { lt: limite };
  }

  const reserved = await tx.proposalUsage.updateMany({
    where,
    data: { proposalsUsed: { increment: 1 } },
  });

  if (reserved.count === 0) {
    throw new ProposalLimitError('PROPOSAL_LIMIT_REACHED', plan?.proposalsPerMonth ?? null);
  }
}

export async function getBillingOverview(prisma: PrismaClient, accountId: string) {
  const period = getCurrentPeriodRange();

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      currentPlan: true,
    },
  });

  if (!account) {
    throw new Error('Conta não encontrada.');
  }

  const usage = await prisma.proposalUsage.findFirst({
    where: {
      accountId,
      periodStart: period.start,
      periodEnd: period.end,
    },
  });

  const plan = account.currentPlan;
  const used = usage?.proposalsUsed ?? 0;
  let total = plan?.proposalsPerMonth ?? null;
  if (plan?.isUnlimited) {
    total = null;
  }

  let trial = null;
  let canCreate = total === null || used < total;
  if (plan?.isTrial) {
    const teste = await buscarTeste(prisma, accountId);
    if (teste.inicio && total !== null) {
      total = Math.max(total - (await usoAnteriorNoTeste(prisma, accountId, teste.inicio, period)), 0);
    }
    canCreate = !teste.terminou && total !== null && used < total;
    trial = { endsAt: teste.fim, ended: teste.terminou };
  }

  return {
    plan: plan
      ? {
          id: plan.id,
          slug: plan.slug,
          name: plan.name,
          currency: plan.currency,
          amountCents: plan.amountCents,
          isUnlimited: plan.isUnlimited,
          proposalsPerMonth: plan.proposalsPerMonth,
          isAnnual: plan.isAnnual,
          isTrial: plan.isTrial,
        }
      : null,
    usage: {
      used,
      total,
      periodStart: period.start,
      periodEnd: period.end,
    },
    trial,
    canCreate,
    stripe: {
      customerId: account.stripeCustomerId ?? null,
    },
  };
}
