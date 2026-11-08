import { verificar, secao, sufixo } from './lib.mjs';

// Signs up a throwaway account and checks sign-in, refresh and sign-out.
export async function verificarAutenticacao(contexto) {
  secao('Auth');
  const email = `smoke-${sufixo()}@example.com`;
  const senha = 'smoke-password-123';

  await verificar('rejects an invalid sign-up', 'POST', '/auth/register', 400, {
    body: { accountName: 'x', email: 'not-an-email', password: '1' },
  });
  const cadastro = await verificar('signs up', 'POST', '/auth/register', 201, {
    body: { accountName: `Smoke ${sufixo()}`, email, password: senha, locale: 'pt-BR' },
  });
  const conta = cadastro.json.account;

  await verificar('refuses a wrong password', 'POST', '/auth/login', 401, {
    body: { accountSlug: conta.slug, email, password: 'wrong-password' },
  });
  const login = await verificar('signs in', 'POST', '/auth/login', 200, {
    body: { accountSlug: conta.slug, email, password: senha },
  });
  const { accessToken, refreshToken } = login.json.tokens;

  await verificar('asks for a token', 'GET', '/auth/me', 401);
  await verificar('returns the profile', 'GET', '/auth/me', 200, { token: accessToken });
  const renovado = await verificar('refreshes the session', 'POST', '/auth/refresh', 200, { body: { refreshToken } });
  await verificar('refuses a bad refresh token', 'POST', '/auth/refresh', 401, { body: { refreshToken: 'bad' } });
  await verificar('signs out', 'POST', '/auth/logout', 204, { body: { refreshToken: renovado.json.tokens.refreshToken } });

  Object.assign(contexto, { conta, email, senha, token: accessToken });
}
