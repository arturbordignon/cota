import { verificar, secao, sufixo } from './lib.mjs';

// Departments, invites, a member signing in and what that member may do.
export async function verificarEquipe(contexto) {
  secao('Team');
  const { token, conta } = contexto;
  await verificar('lists the team', 'GET', '/team', 200, { token });
  for (const periodo of ['month', 'quarter', 'year']) {
    await verificar(`ranks the team (${periodo})`, 'GET', `/team/ranking?period=${periodo}`, 200, { token });
  }

  const departamento = await verificar('creates a department', 'POST', '/team/departments', 201, {
    token,
    body: { name: 'Leitura', description: null, permissionPreset: 'view' },
  });
  const departamentoId = departamento.json.data.id;
  await verificar('changes its permissions', 'PUT', `/team/departments/${departamentoId}`, 200, {
    token,
    body: { permissionPreset: 'view', description: 'Somente leitura' },
  });

  const email = `membro-${sufixo()}@example.com`;
  const convite = await verificar('invites a member', 'POST', '/team/members', 201, {
    token,
    body: { fullName: 'Membro Smoke', email, departmentId: departamentoId },
  });
  await verificar('refuses the same email twice', 'POST', '/team/members', 409, { token, body: { email } });
  const membroId = convite.json.data.id;
  const link = await verificar('makes a new invite link', 'POST', `/team/members/${membroId}/invite-link`, 200, { token, body: {} });
  const conviteToken = new URL(link.json.data.inviteUrl).searchParams.get('token');

  await verificar('previews the invite', 'GET', `/team/invite/preview?token=${conviteToken}`, 200);
  await verificar('accepts the invite', 'POST', '/team/invite/accept', 200, {
    body: { token: conviteToken, fullName: 'Membro Smoke', password: 'member-password-123' },
  });
  const login = await verificar('the member signs in', 'POST', '/auth/login', 200, {
    body: { accountSlug: conta.slug, email, password: 'member-password-123' },
  });
  const tokenMembro = login.json.tokens.accessToken;
  await verificar('a viewer can list proposals', 'GET', '/proposals', 200, { token: tokenMembro });
  await verificar("a viewer can't create clients", 'POST', '/clients', 403, { token: tokenMembro, body: { name: 'x' } });
  await verificar("a member can't see the team", 'GET', '/team', 403, { token: tokenMembro });

  await verificar('updates the member', 'PUT', `/team/members/${membroId}`, 200, { token, body: { jobTitle: 'Vendedor' } });
  await verificar('keeps active members', 'DELETE', `/team/members/${membroId}`, 400, { token });
  await verificar('deactivates the member', 'PUT', `/team/members/${membroId}`, 200, { token, body: { isActive: false } });
  await verificar('blocks the deactivated member', 'GET', '/auth/me', 401, { token: tokenMembro });

  const pendente = await verificar('invites someone else', 'POST', '/team/members', 201, { token, body: { email: `pendente-${sufixo()}@example.com` } });
  await verificar('removes a pending invite', 'DELETE', `/team/members/${pendente.json.data.id}`, 204, { token });
  const vazio = await verificar('creates a department to delete', 'POST', '/team/departments', 201, { token, body: { name: 'Temporário' } });
  await verificar('deletes a department', 'DELETE', `/team/departments/${vazio.json.data.id}`, 204, { token });
}
