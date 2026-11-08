import { verificar, secao } from './lib.mjs';

// Create, read, update and delete a client.
export async function verificarClientes(contexto) {
  secao('Clients');
  const { token } = contexto;
  await verificar('refuses a client without a name', 'POST', '/clients', 400, { token, body: {} });
  const criado = await verificar('creates a client', 'POST', '/clients', 201, {
    token,
    body: { name: 'Construtora Smoke', companyName: 'Smoke Engenharia Ltda', email: 'compras@smoke.example', phone: '(11) 90000-0000' },
  });
  const id = criado.json.data.id;
  await verificar('lists clients', 'GET', '/clients', 200, { token });
  await verificar('reads a client', 'GET', `/clients/${id}`, 200, { token });
  await verificar('updates a client', 'PUT', `/clients/${id}`, 200, { token, body: { phone: null } });
  await verificar('answers 404 for a missing client', 'GET', '/clients/00000000-0000-0000-0000-000000000000', 404, { token });

  const descartavel = await verificar('creates a client to delete', 'POST', '/clients', 201, { token, body: { name: 'Apagar' } });
  await verificar('deletes a client', 'DELETE', `/clients/${descartavel.json.data.id}`, 204, { token });

  contexto.clientId = id;
}
