import { verificar, secao } from './lib.mjs';

// Stages, leads, moving a lead and reordering stages.
export async function verificarPipeline({ token }) {
  secao('Pipeline');
  const etapas = await verificar('creates the starting stages', 'GET', '/pipeline/stages', 200, { token });
  const originais = etapas.json.data;
  const nova = await verificar('adds a stage', 'POST', '/pipeline/stages', 201, { token, body: { name: 'Follow-up', color: 'neutral' } });
  const etapaId = nova.json.data.id;
  await verificar('renames a stage', 'PATCH', `/pipeline/stages/${etapaId}`, 204, { token, body: { name: 'Retorno', color: 'warning' } });

  const lead = await verificar('creates a lead', 'POST', '/pipeline/leads', 201, {
    token,
    body: { stageId: originais[0].id, companyName: 'Usina Smoke', contactName: 'Carla', estimatedValue: 45000 },
  });
  const leadId = lead.json.data.id;
  await verificar('moves a lead', 'PATCH', `/pipeline/leads/${leadId}/move`, 204, { token, body: { stageId: etapaId } });
  await verificar('keeps a stage that has leads', 'DELETE', `/pipeline/stages/${etapaId}`, 400, { token });
  await verificar('moves the lead back', 'PATCH', `/pipeline/leads/${leadId}/move`, 204, { token, body: { stageId: originais[0].id } });

  const todas = [...originais.map((etapa) => ({ id: etapa.id })), { id: etapaId }];
  await verificar('reorders stages', 'PATCH', '/pipeline/stages/reorder', 204, { token, body: { stages: todas.reverse() } });
  await verificar('deletes an empty stage', 'DELETE', `/pipeline/stages/${etapaId}`, 204, { token });
}
