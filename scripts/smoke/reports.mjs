import { verificar, secao } from './lib.mjs';

// The overview and every question the custom report understands.
export async function verificarRelatorios({ token }) {
  secao('Reports');
  await verificar('builds the overview', 'GET', '/reports/overview', 200, { token });
  await verificar('builds the overview for a range', 'GET', '/reports/overview?start=2026-01-01&end=2026-12-31', 200, { token });
  for (const pergunta of [
    'Taxa de conversão mensal',
    'Monthly conversion rate by consultant',
    'Receita por cliente nos últimos 90 dias',
    'Tempo médio até a resposta do cliente',
    'Propostas por consultor',
    'Proposals by status',
  ]) {
    await verificar(`answers "${pergunta}"`, 'POST', '/reports/run', 200, { token, body: { question: pergunta } });
  }
  await verificar('says when it cannot answer', 'POST', '/reports/run', 400, { token, body: { question: 'Quantos guindastes temos?' } });
}
