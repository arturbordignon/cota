import type { FastifyInstance } from 'fastify';
import dayjs from 'dayjs';

export type ReportIntent =
  | 'conversionByMonth'
  | 'conversionByMember'
  | 'revenueByClient'
  | 'daysToAnswer'
  | 'proposalsByMember'
  | 'proposalsByStatus';

export type ReportRow = { name: string; value: number };

type Periodo = { start: dayjs.Dayjs; end: dayjs.Dayjs };

// Words in Portuguese and English, without accents, that point at each question.
const PALAVRAS = {
  conversao: ['taxa', 'conversao', 'conversion', 'aceite', 'acceptance', 'win rate'],
  receita: ['receita', 'faturamento', 'revenue', 'valor', 'value', 'income'],
  cliente: ['cliente', 'client', 'customer'],
  tempo: ['tempo', 'time', 'ciclo', 'cycle', 'dias ate', 'days to', 'demora'],
  membro: ['membro', 'consultor', 'vendedor', 'equipe', 'member', 'consultant', 'seller', 'team', 'salesperson'],
  proposta: ['proposta', 'proposal'],
  status: ['status', 'situacao', 'etapa', 'stage'],
};

function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function contem(texto: string, palavras: string[]) {
  return palavras.some((palavra) => texto.includes(palavra));
}

export function escolherIntencao(pergunta: string): ReportIntent | null {
  const texto = normalizar(pergunta);
  // "Tempo até o aceite" is about time, so time words are checked first.
  if (contem(texto, PALAVRAS.tempo)) {
    return 'daysToAnswer';
  }
  if (contem(texto, PALAVRAS.conversao)) {
    return contem(texto, PALAVRAS.membro) ? 'conversionByMember' : 'conversionByMonth';
  }
  if (contem(texto, PALAVRAS.receita) && contem(texto, PALAVRAS.cliente)) {
    return 'revenueByClient';
  }
  if (contem(texto, PALAVRAS.proposta) && contem(texto, PALAVRAS.membro)) {
    return 'proposalsByMember';
  }
  if (contem(texto, PALAVRAS.status) || contem(texto, PALAVRAS.proposta)) {
    return 'proposalsByStatus';
  }
  return null;
}

// "últimos 90 dias" / "last 90 days" in the question wins over the default range.
export function diasPedidos(pergunta: string): number | null {
  const achado = normalizar(pergunta).match(/(?:ultimos|last|past)\s+(\d{1,3})\s+(?:dias|days)/);
  if (!achado) return null;
  const dias = Number(achado[1]);
  return dias > 0 ? dias : null;
}

function totalDe(totalsJson: unknown) {
  const totais = totalsJson as { total?: unknown } | null;
  return typeof totais?.total === 'number' ? totais.total : 0;
}

function porcentagem(parte: number, todo: number) {
  return todo === 0 ? 0 : Math.round((parte / todo) * 10000) / 100;
}

const SQL: Record<ReportIntent, string> = {
  conversionByMonth: `SELECT date_trunc('month', created_at) AS month,
  COUNT(*) FILTER (WHERE status = 'ACCEPTED')::float / NULLIF(COUNT(*), 0) * 100 AS conversion_rate
FROM proposals
WHERE account_id = :account AND created_at BETWEEN :start AND :end
GROUP BY 1 ORDER BY 1;`,
  conversionByMember: `SELECT u.full_name,
  COUNT(*) FILTER (WHERE p.status = 'ACCEPTED')::float / NULLIF(COUNT(*), 0) * 100 AS conversion_rate
FROM proposals p JOIN users u ON u.id = p.created_by_id
WHERE p.account_id = :account AND p.created_at BETWEEN :start AND :end
GROUP BY 1 ORDER BY 2 DESC;`,
  revenueByClient: `SELECT c.name, SUM((p.totals_json->>'total')::numeric) AS revenue
FROM proposals p JOIN clients c ON c.id = p.client_id
WHERE p.account_id = :account AND p.status = 'ACCEPTED' AND p.created_at BETWEEN :start AND :end
GROUP BY 1 ORDER BY 2 DESC;`,
  daysToAnswer: `SELECT date_trunc('month', sent_at) AS month,
  AVG(EXTRACT(EPOCH FROM COALESCE(accepted_at, declined_at) - sent_at) / 86400) AS days
FROM proposals
WHERE account_id = :account AND sent_at BETWEEN :start AND :end
  AND COALESCE(accepted_at, declined_at) IS NOT NULL
GROUP BY 1 ORDER BY 1;`,
  proposalsByMember: `SELECT u.full_name, COUNT(*) AS proposals
FROM proposals p JOIN users u ON u.id = p.created_by_id
WHERE p.account_id = :account AND p.created_at BETWEEN :start AND :end
GROUP BY 1 ORDER BY 2 DESC;`,
  proposalsByStatus: `SELECT status, COUNT(*) AS proposals
FROM proposals
WHERE account_id = :account AND created_at BETWEEN :start AND :end
GROUP BY 1 ORDER BY 2 DESC;`,
};

export function sqlDaIntencao(intencao: ReportIntent) {
  return SQL[intencao];
}

export async function responderPergunta(
  app: FastifyInstance,
  accountId: string,
  intencao: ReportIntent,
  periodo: Periodo,
): Promise<ReportRow[]> {
  const criadas = { gte: periodo.start.toDate(), lte: periodo.end.toDate() };

  if (intencao === 'daysToAnswer') {
    const respondidas = await app.prisma.proposal.findMany({
      where: { accountId, sentAt: criadas, OR: [{ acceptedAt: { not: null } }, { declinedAt: { not: null } }] },
      select: { sentAt: true, acceptedAt: true, declinedAt: true },
    });
    const porMes = new Map<string, number[]>();
    for (const proposta of respondidas) {
      const resposta = proposta.acceptedAt ?? proposta.declinedAt;
      if (!proposta.sentAt || !resposta) continue;
      const mes = dayjs(proposta.sentAt).format('YYYY-MM');
      const dias = (resposta.getTime() - proposta.sentAt.getTime()) / 86_400_000;
      porMes.set(mes, [...(porMes.get(mes) ?? []), dias]);
    }
    return [...porMes.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, dias]) => ({
        name: mes,
        value: Math.round((dias.reduce((soma, valor) => soma + valor, 0) / dias.length) * 10) / 10,
      }));
  }

  const propostas = await app.prisma.proposal.findMany({
    where: { accountId, createdAt: criadas },
    select: {
      status: true,
      createdAt: true,
      totalsJson: true,
      createdBy: { select: { fullName: true, email: true } },
      client: { select: { name: true } },
    },
  });

  if (intencao === 'proposalsByStatus') {
    const contagem = new Map<string, number>();
    for (const proposta of propostas) {
      contagem.set(proposta.status, (contagem.get(proposta.status) ?? 0) + 1);
    }
    return [...contagem.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  if (intencao === 'revenueByClient') {
    const receita = new Map<string, number>();
    for (const proposta of propostas) {
      if (proposta.status !== 'ACCEPTED' || !proposta.client) continue;
      receita.set(proposta.client.name, (receita.get(proposta.client.name) ?? 0) + totalDe(proposta.totalsJson));
    }
    return [...receita.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }

  // The rest group proposals and compare how many were accepted.
  const grupos = new Map<string, { total: number; aceitas: number }>();
  for (const proposta of propostas) {
    const chave =
      intencao === 'conversionByMonth'
        ? dayjs(proposta.createdAt).format('YYYY-MM')
        : proposta.createdBy.fullName || proposta.createdBy.email;
    const grupo = grupos.get(chave) ?? { total: 0, aceitas: 0 };
    grupo.total += 1;
    if (proposta.status === 'ACCEPTED') grupo.aceitas += 1;
    grupos.set(chave, grupo);
  }

  const linhas = [...grupos.entries()].map(([name, grupo]) => ({
    name,
    value: intencao === 'proposalsByMember' ? grupo.total : porcentagem(grupo.aceitas, grupo.total),
  }));
  if (intencao === 'conversionByMonth') {
    return linhas.sort((a, b) => a.name.localeCompare(b.name));
  }
  return linhas.sort((a, b) => b.value - a.value);
}
