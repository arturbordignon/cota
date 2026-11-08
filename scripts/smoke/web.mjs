// Opens every page of the web app in Portuguese and English, signed in as the
// demo owner, and reports script errors, failed requests and untranslated
// keys. Needs the web app, the API and the demo seed (pnpm local:up).
//
//   pnpm smoke:web
//   SMOKE_SCREENSHOTS=./shots pnpm smoke:web    # also saves a screenshot per page
//
// Chrome is found through CHROME_PATH, then CHROMIUM_EXECUTABLE_PATH, then the
// usual macOS and Linux locations.
import { existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(new URL('../../packages/pdf/package.json', import.meta.url));
const { launch } = require('puppeteer-core');

const WEB_URL = (process.env.SMOKE_WEB_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const CONTA = process.env.SMOKE_ACCOUNT ?? 'cota-demo';
const EMAIL = process.env.SMOKE_EMAIL ?? 'admin@cota.local';
const SENHA = process.env.SMOKE_PASSWORD ?? 'password123';
const PASTA_FOTOS = process.env.SMOKE_SCREENSHOTS;

const PAGINAS_PUBLICAS = ['/', '/sign-in', '/sign-up', '/accept-invite'];
const PAGINAS = [
  '/dashboard',
  '/proposals',
  '/proposals/new',
  '/clients',
  '/clients/new',
  '/services',
  '/services/new',
  '/templates',
  '/templates/builder',
  '/crm',
  '/reports',
  '/team',
  '/departments',
  '/activity',
  '/account',
  '/plans',
  '/notifications',
];

function acharChrome() {
  const candidatos = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_EXECUTABLE_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidatos.find((caminho) => caminho && existsSync(caminho));
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function percorrer(navegador, idioma) {
  const contexto = await navegador.createBrowserContext();
  const pagina = await contexto.newPage();
  await pagina.setViewport({ width: 1440, height: 900 });
  await pagina.setExtraHTTPHeaders({ 'Accept-Language': idioma });

  const problemas = [];
  let atual = '';
  pagina.on('pageerror', (erro) => problemas.push(`[${atual}] script error: ${erro.message}`));
  pagina.on('console', (mensagem) => {
    if (mensagem.type() === 'error' && !/Failed to load resource/.test(mensagem.text())) {
      problemas.push(`[${atual}] console error: ${mensagem.text().slice(0, 200)}`);
    }
  });
  pagina.on('response', (resposta) => {
    if (resposta.status() >= 500) problemas.push(`[${atual}] HTTP ${resposta.status()} ${resposta.url()}`);
  });

  const visitar = async (rota) => {
    atual = `${idioma} ${rota}`;
    try {
      await pagina.goto(`${WEB_URL}${rota}`, { waitUntil: 'networkidle0', timeout: 60000 });
    } catch (erro) {
      problemas.push(`[${atual}] did not load: ${erro.message}`);
      console.log(`✘ ${atual}`);
      return;
    }
    await esperar(600);
    const texto = await pagina.evaluate(() => document.body.innerText);
    // A message key left on screen looks like "section.subsection.key".
    const chaves = texto.match(/\b[a-z]+[A-Za-z]*(\.[a-z][A-Za-z]+){2,}\b/g) ?? [];
    const suspeitas = chaves.filter((chave) => !/\.(com|br|local|example)\b/.test(chave));
    if (suspeitas.length > 0) problemas.push(`[${atual}] untranslated keys: ${[...new Set(suspeitas)].join(', ')}`);
    if (PASTA_FOTOS) {
      mkdirSync(PASTA_FOTOS, { recursive: true });
      const nome = `${idioma}${rota.replace(/[^a-z0-9]+/gi, '_') || '_home'}.png`;
      await pagina.screenshot({ path: path.join(PASTA_FOTOS, nome), fullPage: true });
    }
    console.log(`✔ ${atual}`);
  };

  for (const rota of PAGINAS_PUBLICAS) await visitar(rota);

  atual = `${idioma} sign in`;
  await pagina.goto(`${WEB_URL}/sign-in`, { waitUntil: 'networkidle0' });
  await esperar(800);
  await pagina.type('#account-slug', CONTA);
  await pagina.type('#email', EMAIL);
  await pagina.type('#password', SENHA);
  await Promise.all([pagina.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => null), pagina.click('button[type=submit]')]);
  if (!pagina.url().endsWith('/dashboard')) {
    problemas.push(`[${idioma}] sign-in did not reach the dashboard (is the demo seeded?)`);
    await contexto.close();
    return problemas;
  }

  for (const rota of PAGINAS) await visitar(rota);
  await contexto.close();
  return problemas;
}

const chrome = acharChrome();
if (!chrome) {
  console.error('Chrome not found: set CHROME_PATH to a Chrome or Chromium binary.');
  process.exit(1);
}

const navegador = await launch({ executablePath: chrome, headless: true });
const problemas = [...(await percorrer(navegador, 'pt-BR')), ...(await percorrer(navegador, 'en'))];
await navegador.close();

if (problemas.length > 0) {
  console.log(`\n${problemas.length} problem(s):`);
  for (const problema of problemas) console.log(`  ${problema}`);
  process.exitCode = 1;
} else {
  console.log('\nEvery page loaded without errors in both languages.');
}
