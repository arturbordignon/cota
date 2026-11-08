import { verificar, secao } from './lib.mjs';

// System templates, a custom template and its rendered preview.
export async function verificarModelos(contexto) {
  secao('Templates');
  const { token } = contexto;
  const lista = await verificar('lists templates', 'GET', '/templates', 200, { token });
  await verificar('lists system templates in English', 'GET', '/templates?scope=system&locale=en', 200, { token });
  const sistema = lista.json.data.find((modelo) => !modelo.accountId && modelo.locale === 'pt-BR');
  await verificar('reads a system template', 'GET', `/templates/${sistema.id}`, 200, { token });
  await verificar('previews a system template', 'GET', `/templates/${sistema.id}/preview`, 200, { token });

  const criado = await verificar('creates a template', 'POST', '/templates', 201, {
    token,
    body: { name: 'Modelo smoke', inputSchemaJson: {}, htmlBody: '<h1>{{company.name}}</h1><p>{{client.name}}</p>' },
  });
  const id = criado.json.data.id;
  await verificar('updates a template', 'PUT', `/templates/${id}`, 200, { token, body: { description: 'Atualizado' } });
  await verificar('deletes a template', 'DELETE', `/templates/${id}`, 204, { token });

  contexto.templateId = sistema.id;
}
