export const CACHE_RESOURCES = {
  REPORTS_OVERVIEW: 'reports:overview',
  TEMPLATES_LIST: 'templates:list',
  PIPELINE_STAGES: 'pipeline:stages',
  TEAM_RANKING: 'team:ranking',
} as const;

export type CacheResource = (typeof CACHE_RESOURCES)[keyof typeof CACHE_RESOURCES];
