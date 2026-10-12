import env from '@cota/config';
import { buildServer } from './app.js';

async function start() {
  const app = await buildServer();
  const port = env.PORT;
  const host = env.HOST;
  try {
    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { buildServer };
