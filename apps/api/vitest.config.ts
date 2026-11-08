import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/limpeza-global.ts'],
    environment: 'node',
    // The suite talks to the Postgres and Redis started by docker compose,
    // so files run one at a time to keep rate limits and caches predictable.
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
    },
  },
});
