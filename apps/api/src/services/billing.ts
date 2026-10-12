import dayjs from 'dayjs';
import { Prisma, PrismaClient } from '@cota/db';
import { ProposalLimitError } from '../errors/proposal-limit.js';

interface PeriodRange {
  start: Date;
  end: Date;
}

function getCurrentPeriodRange(): PeriodRange {
  const start = dayjs().startOf('month');
  const end = dayjs().endOf('month');
  return { start: start.toDate(), end: end.toDate() };
}

async function getOrCreateUsageRecord(
  tx: Prisma.TransactionClient,
  accountId: string,
  period: PeriodRange
) {
  let usage = await tx.proposalUsage.findFirst({
    where: {
      accountId,
      periodStart: period.start,
      periodEnd: period.end
    }
  });

  if (!usage) {
    usage = await tx.proposalUsage.create({
      data: {
        accountId,
        periodStart: period.start,
        periodEnd: period.end
      }
    });
  }

  return usage;
}

export async function ensureProposalCapacity(
  tx: Prisma.TransactionClient,
  accountId: string
) {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    include: { currentPlan: true }
  });

  if (!account) {
    throw new Error('Conta não encontrada.');
  }

  const plan = account.currentPlan;

  if (!plan || plan.isUnlimited || plan.proposalsPerMonth == null) {
    return;
  }

  const period = getCurrentPeriodRange();
  const usage = await getOrCreateUsageRecord(tx, accountId, period);

  if (usage.proposalsUsed >= plan.proposalsPerMonth) {
    throw new ProposalLimitError(
      `Você atingiu o limite de ${plan.proposalsPerMonth} propostas neste ciclo. Contrate um plano superior para continuar gerando propostas.`
    );
  }
}

export async function incrementProposalUsage(
  tx: Prisma.TransactionClient,
  accountId: string
) {
  const period = getCurrentPeriodRange();
  const usage = await getOrCreateUsageRecord(tx, accountId, period);

  await tx.proposalUsage.update({
    where: { id: usage.id },
    data: {
      proposalsUsed: usage.proposalsUsed + 1
    }
  });
}

export async function getBillingOverview(prisma: PrismaClient, accountId: string) {
  const period = getCurrentPeriodRange();

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    include: {
      currentPlan: true
    }
  });

  if (!account) {
    throw new Error('Conta não encontrada.');
  }

  const usage = await prisma.proposalUsage.findFirst({
    where: {
      accountId,
      periodStart: period.start,
      periodEnd: period.end
    }
  });

  const plan = account.currentPlan;

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
          isAnnual: plan.isAnnual
        }
      : null,
    usage: {
      used: usage?.proposalsUsed ?? 0,
      total: plan?.proposalsPerMonth ?? null,
      periodStart: period.start,
      periodEnd: period.end
    },
    stripe: {
      customerId: account.stripeCustomerId ?? null
    }
  };
}

export function getDefaultPlanSlug(locale: string) {
  return locale.startsWith('en') ? 'us-50' : 'br-50';
}
