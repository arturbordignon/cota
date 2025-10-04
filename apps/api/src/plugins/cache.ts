import crypto from 'node:crypto';
import fp from 'fastify-plugin';

const DEFAULT_TTL_SECONDS = 120;

export type CachePrefixInput = {
  resource: string;
  accountId?: string | null;
  version?: number;
};

export type CacheKeyInput = CachePrefixInput & {
  params?: unknown;
};

export type CacheFetchOptions<T> = {
  key: string;
  loader: () => Promise<T>;
  ttl?: number;
};

export type CacheSetOptions<T> = {
  key: string;
  value: T;
  ttl?: number;
};

export interface CacheManager {
  buildPrefix(input: CachePrefixInput): string;
  buildKey(input: CacheKeyInput): string;
  fetch<T>(options: CacheFetchOptions<T>): Promise<{ data: T; hit: boolean }>;
  get<T>(key: string): Promise<T | null>;
  set<T>(options: CacheSetOptions<T>): Promise<void>;
  invalidate(keys: string | string[]): Promise<number>;
  invalidatePrefix(prefix: string): Promise<number>;
}

declare module 'fastify' {
  interface FastifyInstance {
    cache: CacheManager;
  }
}

function stableSerialize(value: unknown): string {
  if (value === null) return 'null';
  const type = typeof value;
  if (type === 'number' || type === 'boolean' || type === 'bigint') {
    return String(value);
  }
  if (type === 'string') {
    return JSON.stringify(value);
  }
  if (type === 'undefined') {
    return 'undefined';
  }
  if (value instanceof Date) {
    return `Date(${value.toISOString()})`;
  }
  if (Buffer.isBuffer(value)) {
    return `Buffer(${value.toString('base64')})`;
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return `{${entries.map(([key, val]) => `${JSON.stringify(key)}:${stableSerialize(val)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashParams(params: unknown): string {
  const serialized = stableSerialize(params);
  return crypto.createHash('sha1').update(serialized).digest('hex');
}

function stringifyForCache(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, val) => {
    if (typeof val === 'bigint') {
      return val.toString();
    }
    return val;
  });
}

function buildPrefix({ resource, accountId, version = 1 }: CachePrefixInput): string {
  const scope = accountId ?? 'global';
  return `cache:${resource}:v${version}:${scope}`;
}

function buildKey({ resource, accountId, params, version }: CacheKeyInput): string {
  const prefix = buildPrefix({ resource, accountId, version });
  const suffix = params == null ? 'root' : hashParams(params);
  return `${prefix}:${suffix}`;
}

export default fp(async (app) => {
  const cache: CacheManager = {
    buildPrefix,
    buildKey,
    async fetch<T>({ key, loader, ttl }: CacheFetchOptions<T>) {
      const cached = await app.redis.get(key);
      if (cached) {
        try {
          return { data: JSON.parse(cached) as T, hit: true };
        } catch (error) {
          app.log.warn({ err: error, key }, 'Failed to parse cached payload, ignoring.');
        }
      }

      const data = await loader();
      await cache.set({ key, value: data, ttl });
      return { data, hit: false };
    },
    async get<T>(key: string) {
      const cached = await app.redis.get(key);
      if (!cached) return null;
      try {
        return JSON.parse(cached) as T;
      } catch (error) {
        app.log.warn({ err: error, key }, 'Failed to parse cached payload, returning null.');
        return null;
      }
    },
    async set<T>({ key, value, ttl }: CacheSetOptions<T>) {
      const payload = stringifyForCache(value);
      const effectiveTtl = ttl ?? DEFAULT_TTL_SECONDS;
      if (effectiveTtl > 0) {
        await app.redis.set(key, payload, 'EX', effectiveTtl);
      } else {
        await app.redis.set(key, payload);
      }
    },
    async invalidate(keys) {
      const keyList = Array.isArray(keys) ? keys : [keys];
      if (keyList.length === 0) return 0;
      return app.redis.del(...keyList);
    },
    async invalidatePrefix(prefix) {
      if (!prefix) return 0;
      let cursor = '0';
      let removed = 0;
      const pattern = `${prefix}*`;

      do {
        const [nextCursor, keys] = await app.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 128);
        cursor = nextCursor;
        if (keys.length > 0) {
          removed += await app.redis.del(...keys);
        }
      } while (cursor !== '0');

      return removed;
    },
  };

  app.decorate('cache', cache);
});

export { DEFAULT_TTL_SECONDS };
