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

// Uses one row per account and month. The reservation is a single conditional
// UPDATE, so concurrent requests can't both take the last slot or lose a count.
export async function reserveProposalSlot(
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

  const period = getCurrentPeriodRange();
  await tx.proposalUsage.createMany({
    data: [{ accountId, periodStart: period.start, periodEnd: period.end }],
    skipDuplicates: true
  });

  const plan = account.currentPlan;
  const where: Prisma.ProposalUsageWhereInput = {
    accountId,
    periodStart: period.start,
    periodEnd: period.end
  };
  const limited = plan && !plan.isUnlimited && plan.proposalsPerMonth != null;
  if (limited) {
    where.proposalsUsed = { lt: plan.proposalsPerMonth as number };
  }

  const reserved = await tx.proposalUsage.updateMany({
    where,
    data: { proposalsUsed: { increment: 1 } }
  });

  if (reserved.count === 0) {
    throw new ProposalLimitError(
      `Você atingiu o limite de ${plan?.proposalsPerMonth} propostas neste ciclo. Contrate um plano superior para continuar gerando propostas.`
    );
  }
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
