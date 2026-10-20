import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import env, { buscarProblemasDeProducao } from '@cota/config';
import { describe, expect, it } from 'vitest';

const configuracaoSegura = {
  ...env,
  NODE_ENV: 'production' as const,
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  S3_ACCESS_KEY: 'AKIAEXAMPLEPRODKEY',
  S3_SECRET_KEY: 'prod-secret-key-value',
  DATABASE_URL: 'postgresql://cota_app:long-random-password@db.internal:5432/cota',
  FRONTEND_BASE_URL: 'https://app.cota.com.br',
  STRIPE_API_KEY: '',
  STRIPE_WEBHOOK_SECRET: '',
};

describe('production boot checks', () => {
  it('accepts a properly configured production environment', () => {
    expect(buscarProblemasDeProducao(configuracaoSegura)).toEqual([]);
  });

  it('ignores development', () => {
    expect(buscarProblemasDeProducao({ ...configuracaoSegura, NODE_ENV: 'development', JWT_ACCESS_SECRET: 'change-me' })).toEqual([]);
  });

  it.each([
    ['sample JWT secret', { JWT_ACCESS_SECRET: 'change-me' }],
    ['example .env secret', { JWT_REFRESH_SECRET: 'troque-este-segredo-de-refresh-local' }],
    ['short JWT secret', { JWT_ACCESS_SECRET: 'short-secret' }],
    ['same secret twice', { JWT_REFRESH_SECRET: 'a'.repeat(48) }],
    ['MinIO credentials', { S3_ACCESS_KEY: 'minio', S3_SECRET_KEY: 'minio123' }],
    ['local database password', { DATABASE_URL: 'postgresql://cota:cota@postgres:5432/cota' }],
    ['plain http frontend', { FRONTEND_BASE_URL: 'http://app.cota.com.br' }],
    ['Stripe without webhook secret', { STRIPE_API_KEY: 'sk_live_x' }],
  ])('rejects %s', (_nome, mudanca) => {
    expect(buscarProblemasDeProducao({ ...configuracaoSegura, ...mudanca }).length).toBeGreaterThan(0);
  });

  it('the process exits before listening when production uses sample secrets', () => {
    const configDist = fileURLToPath(new URL('../../../packages/config/dist/index.js', import.meta.url));
    const resultado = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(configDist)})`], {
      env: {
        PATH: process.env.PATH,
        DOTENV_CONFIG_PATH: '/dev/null',
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://cota:cota@localhost:5432/cota',
        JWT_ACCESS_SECRET: 'change-me',
      },
      encoding: 'utf8',
    });
    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain('Refusing to start in production');
  });
});
