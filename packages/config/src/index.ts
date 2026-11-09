import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(moduleDir, '../../..');
const envCandidates = [
  process.env.DOTENV_CONFIG_PATH,
  resolve(projectRoot, '.env'),
  resolve(projectRoot, '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '.env.local')
];

const seen = new Set<string>();
for (const candidate of envCandidates) {
  if (!candidate || seen.has(candidate)) {
    continue;
  }
  seen.add(candidate);
  if (existsSync(candidate)) {
    loadEnv({ path: candidate, override: false });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.string().default('info'),
  // Addresses of the reverse proxies allowed to set X-Forwarded-For: a comma
  // list of IPs/CIDRs, or "uniquelocal" for a load balancer on private subnets.
  // Off by default so a client can't pick its own IP.
  TRUST_PROXY: z.string().default('false'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().or(z.literal('')),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('cota-local'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  // Address browsers use to reach the bucket, when it differs from the one the
  // API and worker use (in Docker: localhost:9000 outside, minio:9000 inside).
  // Links handed to the browser are signed for this address.
  S3_PUBLIC_ENDPOINT: z.string().default(''),
  S3_ACCESS_KEY: z.string().default('minio'),
  S3_SECRET_KEY: z.string().default('minio123'),
  JWT_ACCESS_SECRET: z.string().default('change-me'),
  JWT_REFRESH_SECRET: z.string().default('change-me-refresh'),
  FRONTEND_BASE_URL: z.string().default('http://localhost:5173'),
  CDN_BASE_URL: z.string().default('http://localhost:3000'),
  QUEUE_PREFIX: z.string().default('cota'),
  PDF_RENDER_TIMEOUT_MS: z.coerce.number().default(120000),
  CHROMIUM_EXECUTABLE_PATH: z.string().default(''),
  // Chromium's own sandbox needs user namespaces, which the hardened worker
  // container (non-root, no capabilities, no-new-privileges) doesn't allow;
  // there the container is the sandbox and the image turns this off.
  PDF_CHROMIUM_SANDBOX: z
    .union([z.literal('true'), z.literal('false')])
    .default('true')
    .transform((value) => value === 'true'),
  AUDIT_LOG_STORE_IP: z
    .union([z.literal('true'), z.literal('false')])
    .default('true')
    .transform((value) => value === 'true'),
  STRIPE_API_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_BR_50: z.string().default(''),
  STRIPE_PRICE_BR_50_ANNUAL: z.string().default(''),
  STRIPE_PRICE_BR_100: z.string().default(''),
  STRIPE_PRICE_BR_100_ANNUAL: z.string().default(''),
  STRIPE_PRICE_BR_UNLIMITED: z.string().default(''),
  STRIPE_PRICE_BR_UNLIMITED_ANNUAL: z.string().default(''),
  STRIPE_PRICE_US_50: z.string().default(''),
  STRIPE_PRICE_US_50_ANNUAL: z.string().default(''),
  STRIPE_PRICE_US_100: z.string().default(''),
  STRIPE_PRICE_US_100_ANNUAL: z.string().default(''),
  STRIPE_PRICE_US_UNLIMITED: z.string().default(''),
  STRIPE_PRICE_US_UNLIMITED_ANNUAL: z.string().default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_SECURE: z
    .union([z.literal('true'), z.literal('false')])
    .default('false')
    .transform((value) => value === 'true'),
  EMAIL_FROM: z.string().default('convites@cota.local')
});

type Env = z.infer<typeof envSchema>;

const SEGREDOS_DE_EXEMPLO = [
  'change-me',
  'change-me-refresh',
  'troque-este-segredo-de-acesso-local',
  'troque-este-segredo-de-refresh-local',
];

const TAMANHO_MINIMO_SEGREDO = 32;

// Production must never start with the sample secrets from .env.example or the
// defaults above: anyone who reads the repo could forge tokens or reach storage.
export function buscarProblemasDeProducao(valores: Env): string[] {
  if (valores.NODE_ENV !== 'production') {
    return [];
  }

  const problemas: string[] = [];

  for (const chave of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    const segredo = valores[chave];
    if (SEGREDOS_DE_EXEMPLO.includes(segredo)) {
      problemas.push(`${chave} still has the sample value`);
    } else if (segredo.length < TAMANHO_MINIMO_SEGREDO) {
      problemas.push(`${chave} must have at least ${TAMANHO_MINIMO_SEGREDO} characters`);
    }
  }
  if (valores.JWT_ACCESS_SECRET === valores.JWT_REFRESH_SECRET) {
    problemas.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (valores.S3_ACCESS_KEY === 'minio' || valores.S3_SECRET_KEY === 'minio123') {
    problemas.push('S3_ACCESS_KEY / S3_SECRET_KEY still have the local MinIO values');
  }

  if (/\/\/cota:cota@/.test(valores.DATABASE_URL)) {
    problemas.push('DATABASE_URL still uses the local cota:cota password');
  }

  if (!valores.FRONTEND_BASE_URL.startsWith('https://')) {
    problemas.push('FRONTEND_BASE_URL must be an https:// address');
  }

  if (valores.STRIPE_API_KEY && !valores.STRIPE_WEBHOOK_SECRET) {
    problemas.push('STRIPE_WEBHOOK_SECRET is required when STRIPE_API_KEY is set');
  }

  return problemas;
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env: Env = parsed.data;

const problemasDeProducao = buscarProblemasDeProducao(env);
if (problemasDeProducao.length > 0) {
  console.error('Refusing to start in production:\n- ' + problemasDeProducao.join('\n- '));
  process.exit(1);
}

export default env;
export type { Env };
