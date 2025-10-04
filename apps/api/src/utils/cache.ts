import type { FastifyInstance } from 'fastify';

import { CACHE_RESOURCES } from '../constants/cache.js';

export function buildReportsOverviewPrefix(app: FastifyInstance, accountId: string) {
  return app.cache.buildPrefix({
    resource: CACHE_RESOURCES.REPORTS_OVERVIEW,
    accountId,
  });
}

export async function invalidateReportsOverviewCache(app: FastifyInstance, accountId: string) {
  const prefix = buildReportsOverviewPrefix(app, accountId);
  await app.cache.invalidatePrefix(prefix);
}

export function buildTeamRankingPrefix(app: FastifyInstance, accountId: string) {
  return app.cache.buildPrefix({
    resource: CACHE_RESOURCES.TEAM_RANKING,
    accountId,
  });
}

export async function invalidateTeamRankingCache(app: FastifyInstance, accountId: string) {
  const prefix = buildTeamRankingPrefix(app, accountId);
  await app.cache.invalidatePrefix(prefix);
}
