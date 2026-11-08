// Calls every API endpoint once against a running API, using a throwaway
// account that is deleted at the end. Usage: pnpm smoke:api
// (SMOKE_API_URL defaults to http://localhost:3333/api/v1).
import { API_URL, chamar, resumo } from './lib.mjs';
import { verificarAutenticacao } from './auth.mjs';
import { verificarConta } from './account.mjs';
import { verificarClientes } from './clients.mjs';
import { verificarServicos } from './services.mjs';
import { verificarModelos } from './templates.mjs';

const contexto = {};

const saude = await chamar('GET', API_URL.replace(/\/api\/v1$/, '/health')).catch(() => null);
if (!saude || saude.status !== 200) {
  console.error(`The API at ${API_URL} is not answering. Start it with pnpm local:up first.`);
  process.exit(1);
}

await verificarAutenticacao(contexto);
await verificarConta(contexto);
await verificarClientes(contexto);
await verificarServicos(contexto);
await verificarModelos(contexto);

process.exitCode = resumo() ? 0 : 1;
