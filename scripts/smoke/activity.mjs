import { verificar, secao } from './lib.mjs';

// The bell and the activity log, after everything above created events.
export async function verificarAtividade({ token }) {
  secao('Notifications and activity');
  const notificacoes = await verificar('lists notifications', 'GET', '/notifications', 200, { token });
  const primeira = notificacoes.json.data[0];
  if (primeira) {
    await verificar('marks one as read', 'POST', `/notifications/${primeira.id}/read`, 204, { token, body: {} });
  }
  await verificar('marks all as read', 'POST', '/notifications/read-all', 204, { token, body: {} });
  await verificar('lists the activity log', 'GET', '/audit-events', 200, { token });
  await verificar('filters the activity log', 'GET', '/audit-events?category=proposal&limit=10', 200, { token });
}
