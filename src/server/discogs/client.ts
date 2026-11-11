import "server-only";
import {
  DISCOGS_ORIGIN,
  cacheMax,
  cacheTtlMs,
  discogsToken,
  maxQueue,
  maxRetries,
  minIntervalMs,
  timeoutMs,
  userAgent,
} from "./config";
import { createLruCache, type LruCache } from "../http/cache";
import { createRequestScheduler } from "../http/scheduler";
import type { DGArtist, DGLabel, DGMaster, DGRelease } from "./types";

export interface DiscogsClientDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  setTimeoutImpl?: typeof setTimeout;
  token?: string;
}

export function createDiscogsClient(deps: DiscogsClientDeps = {}) {
  const now = deps.now ?? Date.now;
  const token = deps.token !== undefined ? deps.token : discogsToken;
  const scheduler = createRequestScheduler({
    minIntervalMs,
    maxQueue,
    maxRetries,
    timeoutMs,
    headers: {
      "User-Agent": userAgent,
      ...(token ? { Authorization: `Discogs token=${token}` } : {}),
    },
    fetchImpl: deps.fetchImpl,
    now,
    setTimeoutImpl: deps.setTimeoutImpl,
  });
  const cache: LruCache<unknown> = createLruCache({
    max: cacheMax,
    ttlMs: cacheTtlMs,
    now,
  });

  async function get<T>(path: string): Promise<T> {
    const url = `${DISCOGS_ORIGIN}${path}`;
    const cached = cache.get(url);
    if (cached !== undefined) return cached as T;
    const json = await scheduler.request(url);
    cache.set(url, json);
    return json as T;
  }

  return {
    getRelease(id: number) {
      return get<DGRelease>(`/releases/${id}`);
    },
    getMaster(id: number) {
      return get<DGMaster>(`/masters/${id}`);
    },
    getArtist(id: number) {
      return get<DGArtist>(`/artists/${id}`);
    },
    getLabel(id: number) {
      return get<DGLabel>(`/labels/${id}`);
    },
  };
}

export type DiscogsClient = ReturnType<typeof createDiscogsClient>;

// Singleton surviving dev HMR.
const GLOBAL_KEY = Symbol.for("dig.discogs.client");
const g = globalThis as Record<symbol, unknown>;

export const discogsClient: DiscogsClient =
  (g[GLOBAL_KEY] as DiscogsClient | undefined) ??
  (g[GLOBAL_KEY] = createDiscogsClient());
