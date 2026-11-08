import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import dayjs from 'dayjs';

import { CACHE_RESOURCES } from '../../constants/cache.js';
import { exigirPermissao } from '../../utils/permissions.js';
import {
  diasPedidos,
  escolherIntencao,
  responderPergunta,
  sqlDaIntencao,
} from '../../services/report-questions.js';

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
  app.addHook('preHandler', app.authenticate);
  app.addHook('preHandler', exigirPermissao('reports', 'view'));

  app.get('/overview', async (request, reply) => {

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
        // Charts label each consultant by name, never by the raw user id.
        const idsMembros = Object.values(propostasPorMembroMap)
          .map((membro) => membro.createdById)
          .filter((id): id is string => Boolean(id));
        const membros = await app.prisma.user.findMany({
          where: { id: { in: idsMembros }, accountId: request.user.accountId },
          select: { id: true, fullName: true, email: true },
        });
        const nomes = new Map(membros.map((membro) => [membro.id, membro.fullName || membro.email]));
        const propostasPorMembro = Object.values(propostasPorMembroMap).map((membro) => ({
          ...membro,
          createdByName: membro.createdById ? (nomes.get(membro.createdById) ?? null) : null,
        }));

        function buscarCidade(payloadJson: unknown) {
          const payload = payloadJson as { job?: { siteLocation?: unknown } } | null;
          if (typeof payload?.job?.siteLocation !== 'string') return 'Sem cidade';
          if (payload.job.siteLocation.trim() === '') return 'Sem cidade';
          return payload.job.siteLocation.trim();
        }

        const receitaPorCidadeMap = accepted.reduce<Record<string, number>>((acc, p) => {
          const cidade = buscarCidade(p.payloadJson);
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
    const body = reportBodySchema.parse(request.body);

    const intencao = escolherIntencao(body.question);
    if (!intencao) {
      return reply.status(400).send({
        message: 'This question is not supported yet.',
        code: 'REPORT_QUESTION_UNSUPPORTED',
      });
    }

    const defaultEnd = dayjs();
    const end = parseDate(body.dateRange?.end, defaultEnd).endOf('day');
    const dias = diasPedidos(body.question);
    const start = dias
      ? end.subtract(dias - 1, 'day').startOf('day')
      : parseDate(body.dateRange?.start, defaultEnd.subtract(30, 'day')).startOf('day');

    const result = await responderPergunta(app, request.user.accountId, intencao, { start, end });

    return reply.send({
      data: {
        intent: intencao,
        sql: sqlDaIntencao(intencao),
        visualization: body.visualization,
        range: { start: start.toISOString(), end: end.toISOString() },
        result,
      },
    });
  });
};

export default reportsRoutes;
