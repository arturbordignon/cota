import { verificar, secao } from './lib.mjs';

// Deletes the throwaway account, which also checks account deletion.
export async function apagarConta({ token, conta, senha }) {
  secao('Account deletion');
  await verificar('asks for the account address', 'DELETE', '/account', 400, { token, body: { password: senha, confirmSlug: 'wrong' } });
  await verificar('deletes the account', 'DELETE', '/account', 204, { token, body: { password: senha, confirmSlug: conta.slug } });
  await verificar('the old session stops working', 'GET', '/auth/me', 401, { token });
}
