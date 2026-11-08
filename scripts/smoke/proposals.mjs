import { chamar, verificar, secao } from './lib.mjs';

// 1×1 PNG, enough to pass the image check on upload.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64',
);

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A proposal from creation to the client's answer, with a photo and the PDF.
export async function verificarPropostas(contexto) {
  secao('Proposals');
  const { token, templateId, clientId } = contexto;
  const criada = await verificar('creates a proposal', 'POST', '/proposals', 201, {
    token,
    body: {
      templateId,
      clientId,
      title: 'Içamento smoke',
      payload: { job: { projectName: 'Içamento smoke', siteLocation: 'Santos, SP', schedule: '10/12 a 12/12', scope: ['Içamento'] } },
      totals: { mobilization: 1500, dailyRate: 3500, days: 3 },
    },
  });
  const { id, publicSlug } = criada.json.data;
  await verificar('lists proposals', 'GET', '/proposals?status=DRAFT', 200, { token });
  await verificar('reads a proposal by id', 'GET', `/proposals/${id}`, 200, { token });
  await verificar('reads a proposal by slug', 'GET', `/proposals/${publicSlug}`, 200, { token });
  await verificar('updates a proposal', 'PATCH', `/proposals/${id}`, 200, { token, body: { title: 'Içamento smoke v2' } });

  secao('Photos');
  const destino = await verificar('hands out an upload URL', 'POST', '/assets/upload-url', 200, {
    token,
    body: { proposalId: id, contentType: 'image/png', size: PNG.length },
  });
  await verificar('refuses an upload of HTML', 'POST', '/assets/upload-url', 400, {
    token,
    body: { proposalId: id, contentType: 'text/html', size: 10 },
  });
  const envio = await fetch(destino.json.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG });
  console.log(`${envio.ok ? '✔' : '✘'} ${envio.status} PUT    (storage)  uploads the photo`);
  await verificar('attaches the photo', 'PATCH', `/proposals/${id}`, 200, {
    token,
    body: { assets: [{ s3ObjectKey: destino.json.key, mimeType: 'image/png', position: 0 }] },
  });

  secao('PDF');
  await verificar('has no PDF before generating', 'GET', `/proposals/${id}/pdf`, 404, { token });
  await verificar('queues the PDF', 'POST', `/proposals/${id}/generate`, 200, { token, body: {} });
  // The worker renders it in a few seconds; without the worker this just skips.
  let pdfPronto = false;
  for (let tentativa = 0; tentativa < 20 && !pdfPronto; tentativa += 1) {
    await esperar(1500);
    pdfPronto = (await chamar('GET', `/proposals/${id}/pdf`, { token })).status === 200;
  }
  if (pdfPronto) {
    await verificar('returns the PDF link', 'GET', `/proposals/${id}/pdf`, 200, { token });
  } else {
    console.log('… the PDF is not ready: is the worker running?');
  }

  secao('Public page');
  await verificar('keeps drafts private', 'GET', `/public/proposals/${publicSlug}`, 404);
  await verificar('sends the proposal', 'POST', `/proposals/${id}/send`, 200, { token, body: {} });
  await verificar('shows the public page', 'GET', `/public/proposals/${publicSlug}`, 200);
  await verificar('records the acceptance', 'POST', `/public/proposals/${publicSlug}/accept`, 200, { body: {} });
  await verificar('refuses a second answer', 'POST', `/public/proposals/${publicSlug}/decline`, 409, { body: {} });

  const outra = await verificar('creates a proposal to decline', 'POST', '/proposals', 201, { token, body: { templateId } });
  await verificar('sends it', 'POST', `/proposals/${outra.json.data.id}/send`, 200, { token, body: {} });
  await verificar('records the decline', 'POST', `/public/proposals/${outra.json.data.publicSlug}/decline`, 200, { body: {} });
}
