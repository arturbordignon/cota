import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import dayjs from 'dayjs';

import { CACHE_RESOURCES } from '../../constants/cache.js';

const reportBodySchema = z.object({
  question: z.string().min(1),
  visualization: z.enum(['table', 'bar', 'line']).default('table'),
  dateRange: z
    .object({
      start: z.string().datetime({ offset: true }).or(z.string()),
      end: z.string().datetime({ offset: true }).or(z.string()),
    })
    .optional(),
});

function parseDate(date: string | undefined, fallback: dayjs.Dayjs) {
  if (!date) return fallback;
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed : fallback;
}

const reportsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/overview', async (request, reply) => {
    await request.jwtVerify();

    const q = request.query as { start?: string; end?: string };
    const defaultEnd = dayjs();
    const defaultStart = defaultEnd.startOf('month');
    const start = parseDate(q?.start, defaultStart).startOf('day');
    const end = parseDate(q?.end, defaultEnd).endOf('day');
    const startIso = start.toISOString();
    const endIso = end.toISOString();

    const cacheKey = app.cache.buildKey({
      resource: CACHE_RESOURCES.REPORTS_OVERVIEW,
      accountId: request.user.accountId,
      params: { start: startIso, end: endIso },
    });

    const { data, hit } = await app.cache.fetch({
      key: cacheKey,
      ttl: 300,
      loader: async () => {
        const proposals = await app.prisma.proposal.findMany({
          where: {
            accountId: request.user.accountId,
            createdAt: { gte: start.toDate(), lte: end.toDate() },
          },
          include: { client: true },
        });

        const proposalsByStatus = proposals.reduce<Record<string, number>>((acc, p) => {
          acc[p.status] = (acc[p.status] ?? 0) + 1;
          return acc;
        }, {});

        const recentProposals = [...proposals]
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 10)
          .map((p) => ({
            id: p.id,
            title: p.title,
            status: p.status,
            client: p.client?.name ?? null,
            createdAt: p.createdAt,
          }));

        function getNumericTotal(totalsJson: unknown) {
          const t = totalsJson as Record<string, unknown> | null;
          if (t && typeof t.total === 'number') return Number(t.total);
          if (t && typeof t.grandTotal === 'number') return Number(t.grandTotal);
          return 0;
        }

        const totalCount = proposals.length;
        const accepted = proposals.filter((p) => p.status === 'ACCEPTED');
        const acceptedCount = accepted.length;
        const receitaAceita = accepted.reduce((acc, p) => acc + getNumericTotal(p.totalsJson), 0);
        const taxaConversao = totalCount === 0 ? 0 : (acceptedCount / totalCount) * 100;
        const ticketMedioAceitas = acceptedCount === 0 ? 0 : receitaAceita / acceptedCount;

        const abertas14dMais = proposals.filter((p) => {
          const isOpen = p.status !== 'ACCEPTED' && p.status !== 'DECLINED' && p.status !== 'EXPIRED';
          if (!isOpen) return false;
          const ageDays = dayjs().diff(dayjs(p.createdAt), 'day');
          return ageDays >= 14;
        }).length;

        const revenueByClient = proposals
          .filter((p) => p.status === 'ACCEPTED')
          .reduce<Record<string, { client: string; value: number }>>((acc, p) => {
            const key = p.client?.name ?? 'Sem cliente';
            const current = acc[key] ?? { client: key, value: 0 };
            current.value += getNumericTotal(p.totalsJson);
            acc[key] = current;
            return acc;
          }, {});
        const topClients = Object.values(revenueByClient)
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        const propostasPorMembroMap = proposals.reduce<
          Record<string, { createdById: string | null; total: number; aceitas: number }>
        >((acc, p) => {
          const key = p.createdById ?? 'desconhecido';
          if (!acc[key]) acc[key] = { createdById: p.createdById ?? null, total: 0, aceitas: 0 };
          acc[key].total += 1;
          if (p.status === 'ACCEPTED') acc[key].aceitas += 1;
          return acc;
        }, {});
        const propostasPorMembro = Object.values(propostasPorMembroMap);

        const receitaPorCidadeMap = accepted.reduce<Record<string, number>>((acc, p) => {
          const cidade = (p.client?.city as string | undefined)?.trim() || 'Sem cidade';
          acc[cidade] = (acc[cidade] ?? 0) + getNumericTotal(p.totalsJson);
          return acc;
        }, {});
        const receitaPorCidade = Object.entries(receitaPorCidadeMap)
          .map(([city, value]) => ({ city, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 8);

        const pipelineStages = await app.prisma.pipelineStage.findMany({
          where: { accountId: request.user.accountId },
          include: { leads: { select: { estimatedValue: true } } },
          orderBy: { position: 'asc' },
        });
        const pipelineSummary = pipelineStages.map((stage) => {
          const totalValue = stage.leads.reduce(
            (acc, lead) => acc + Number(lead.estimatedValue ?? 0),
            0,
          );
          return { stageId: stage.id, name: stage.name, leadCount: stage.leads.length, totalValue };
        });

        return {
          range: { start: startIso, end: endIso },
          kpis: {
            receitaAceita,
            taxaConversao: Number(taxaConversao.toFixed(2)),
            ticketMedioAceitas,
            propostasAbertas14dMais: abertas14dMais,
          },
          proposalsByStatus,
          topClients,
          propostasPorMembro,
          receitaPorCidade,
          recentProposals,
          pipelineSummary,
        };
      },
    });

    return reply.send({ data, cached: hit });
  });

  app.post('/run', async (request, reply) => {
    await request.jwtVerify();
    const body = reportBodySchema.parse(request.body);

    const defaultEnd = dayjs();
    const defaultStart = defaultEnd.subtract(30, 'day');

    const start = parseDate(body.dateRange?.start, defaultStart).startOf('day');
    const end = parseDate(body.dateRange?.end, defaultEnd).endOf('day');

    const lowerQuestion = body.question.toLowerCase();

    if (lowerQuestion.includes('taxa') || lowerQuestion.includes('conversion')) {
      const total = await app.prisma.proposal.count({
        where: {
          accountId: request.user.accountId,
          createdAt: {
            gte: start.toDate(),
            lte: end.toDate(),
          },
        },
      });

      const accepted = await app.prisma.proposal.count({
        where: {
          accountId: request.user.accountId,
          status: 'ACCEPTED',
          createdAt: {
            gte: start.toDate(),
            lte: end.toDate(),
          },
        },
      });

      const conversion = total === 0 ? 0 : (accepted / total) * 100;

      const sql = `SELECT\n  COUNT(*) FILTER (WHERE status = 'ACCEPTED')::float / NULLIF(COUNT(*), 0) * 100 AS conversion_rate\nFROM proposals\nWHERE account_id = '${request.user.accountId}'\n  AND created_at BETWEEN '${start.toISOString()}' AND '${end.toISOString()}';`;

      return reply.send({
        data: {
          sql,
          visualization: body.visualization,
          range: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          result: {
            total,
            accepted,
            conversionRate: Number(conversion.toFixed(2)),
          },
        },
      });
    }

    if (lowerQuestion.includes('proposta') && lowerQuestion.includes('membro')) {
      const rows = await app.prisma.proposal.groupBy({
        by: ['createdById'],
        where: {
          accountId: request.user.accountId,
          createdAt: {
            gte: start.toDate(),
            lte: end.toDate(),
          },
        },
        _count: {
          _all: true,
        },
      });

      const sql = `SELECT created_by_id, COUNT(*) AS total_proposals\nFROM proposals\nWHERE account_id = '${request.user.accountId}'\n  AND created_at BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'\nGROUP BY created_by_id;`;

      return reply.send({
        data: {
          sql,
          visualization: body.visualization,
          range: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
          result: rows.map((row) => ({
            createdById: row.createdById,
            proposals: row._count._all,
          })),
        },
      });
    }

    return reply.status(400).send({
      message:
        'Ainda não temos um template para esta pergunta. Tente perguntar sobre a taxa de conversão ou propostas por membro da equipe.',
    });
  });
};

export default reportsRoutes;
