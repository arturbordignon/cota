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
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().or(z.literal('')),
  AWS_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('crane-proposals-local'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_ACCESS_KEY: z.string().default('minio'),
  S3_SECRET_KEY: z.string().default('minio123'),
  JWT_ACCESS_SECRET: z.string().default('change-me'),
  JWT_REFRESH_SECRET: z.string().default('change-me-refresh'),
  FRONTEND_BASE_URL: z.string().default('http://localhost:5173'),
  CDN_BASE_URL: z.string().default('http://localhost:3000'),
  QUEUE_PREFIX: z.string().default('crane'),
  PDF_RENDER_TIMEOUT_MS: z.coerce.number().default(120000),
  CHROMIUM_EXECUTABLE_PATH: z.string().default(''),
  AUDIT_LOG_STORE_IP: z
    .union([z.literal('true'), z.literal('false')])
    .default('true')
    .transform((value) => value === 'true'),
  STRIPE_API_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),
  STRIPE_PRICE_BR_50: z.string().default(''),
  STRIPE_PRICE_BR_100: z.string().default(''),
  STRIPE_PRICE_BR_UNLIMITED: z.string().default(''),
  STRIPE_PRICE_BR_UNLIMITED_ANNUAL: z.string().default(''),
  STRIPE_PRICE_US_50: z.string().default(''),
  STRIPE_PRICE_US_100: z.string().default(''),
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
  EMAIL_FROM: z.string().default('convites@crane.local')
});

type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env: Env = parsed.data;

export default env;
export type { Env };
