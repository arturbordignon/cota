import { verificar, secao } from './lib.mjs';

// The service (equipment) catalog.
export async function verificarServicos({ token }) {
  secao('Services');
  const criado = await verificar('creates a service', 'POST', '/equipment', 201, {
    token,
    body: { name: 'Guindaste 90 t', capacityTons: 90, dailyRate: 6200, description: 'Lança de 60 m' },
  });
  const id = criado.json.data.id;
  await verificar('lists services', 'GET', '/equipment', 200, { token });
  await verificar('updates a service', 'PUT', `/equipment/${id}`, 200, { token, body: { dailyRate: null, notes: '' } });
  await verificar('deletes a service', 'DELETE', `/equipment/${id}`, 204, { token });
}
