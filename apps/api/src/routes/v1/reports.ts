import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import dayjs from 'dayjs';

const reportBodySchema = z.object({
  question: z.string().min(1),
  visualization: z.enum(['table', 'bar', 'line']).default('table'),
  dateRange: z
    .object({
      start: z.string().datetime({ offset: true }).or(z.string()),
      end: z.string().datetime({ offset: true }).or(z.string())
    })
    .optional()
});

function parseDate(date: string | undefined, fallback: dayjs.Dayjs) {
  if (!date) return fallback;
  const parsed = dayjs(date);
  return parsed.isValid() ? parsed : fallback;
}

const reportsRoutes: FastifyPluginAsync = async (app) => {
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
            lte: end.toDate()
          }
        }
      });

      const accepted = await app.prisma.proposal.count({
        where: {
          accountId: request.user.accountId,
          status: 'ACCEPTED',
          createdAt: {
            gte: start.toDate(),
            lte: end.toDate()
          }
        }
      });

      const conversion = total === 0 ? 0 : (accepted / total) * 100;

      const sql = `SELECT\n  COUNT(*) FILTER (WHERE status = 'ACCEPTED')::float / NULLIF(COUNT(*), 0) * 100 AS conversion_rate\nFROM proposals\nWHERE account_id = '${request.user.accountId}'\n  AND created_at BETWEEN '${start.toISOString()}' AND '${end.toISOString()}';`;

      return reply.send({
        data: {
          sql,
          visualization: body.visualization,
          range: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          result: {
            total,
            accepted,
            conversionRate: Number(conversion.toFixed(2))
          }
        }
      });
    }

    if (lowerQuestion.includes('proposta') && lowerQuestion.includes('membro')) {
      const rows = await app.prisma.proposal.groupBy({
        by: ['createdById'],
        where: {
          accountId: request.user.accountId,
          createdAt: {
            gte: start.toDate(),
            lte: end.toDate()
          }
        },
        _count: {
          _all: true
        }
      });

      const sql = `SELECT created_by_id, COUNT(*) AS total_proposals\nFROM proposals\nWHERE account_id = '${request.user.accountId}'\n  AND created_at BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'\nGROUP BY created_by_id;`;

      return reply.send({
        data: {
          sql,
          visualization: body.visualization,
          range: {
            start: start.toISOString(),
            end: end.toISOString()
          },
          result: rows.map((row) => ({
            createdById: row.createdById,
            proposals: row._count._all
          }))
        }
      });
    }

    return reply.status(400).send({
      message:
        'Ainda não temos um template para esta pergunta. Tente perguntar sobre a taxa de conversão ou propostas por membro da equipe.'
    });
  });
};

export default reportsRoutes;
