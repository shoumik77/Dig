import "server-only";
import {
  MB_ORIGIN,
  cacheMax,
  cacheTtlMs,
  maxQueue,
  maxRetries,
  minIntervalMs,
  timeoutMs,
  userAgent,
} from "./config";
import { createLruCache, type LruCache } from "./cache";
import { createRequestScheduler } from "./scheduler";
import type {
  MBArtist,
  MBArtistSearchResponse,
  MBLabel,
  MBLabelSearchResponse,
  MBRelease,
  MBReleaseBrowseResponse,
  MBReleaseSearchResponse,
} from "./types";

export interface MusicBrainzClientDeps {
  fetchImpl?: typeof fetch;
  now?: () => number;
  setTimeoutImpl?: typeof setTimeout;
}

export interface PageParams {
  limit: number;
  offset: number;
}

const LUCENE_SPECIAL =
  /&&|\|\||[+\-!(){}[\]^"~*?:\\/]/g;

export function escapeLucene(query: string): string {
  return query.replace(LUCENE_SPECIAL, (m) => `\\${m}`);
}

function searchParams(params: Record<string, string | number>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) usp.set(k, String(v));
  usp.set("fmt", "json");
  return usp.toString();
}

export function createMusicBrainzClient(deps: MusicBrainzClientDeps = {}) {
  const now = deps.now ?? Date.now;
  const scheduler = createRequestScheduler({
    minIntervalMs,
    maxQueue,
    maxRetries,
    timeoutMs,
    headers: { "User-Agent": userAgent },
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
    const url = `${MB_ORIGIN}${path}`;
    const cached = cache.get(url);
    if (cached !== undefined) return cached as T;
    const json = await scheduler.request(url);
    cache.set(url, json);
    return json as T;
  }

  return {
    searchLabels(q: string, { limit, offset }: PageParams) {
      return get<MBLabelSearchResponse>(
        `/label?${searchParams({ query: escapeLucene(q), limit, offset })}`
      );
    },

    searchArtists(q: string, { limit, offset }: PageParams) {
      return get<MBArtistSearchResponse>(
        `/artist?${searchParams({ query: escapeLucene(q), limit, offset })}`
      );
    },

    searchReleases(q: string, { limit, offset }: PageParams) {
      return get<MBReleaseSearchResponse>(
        `/release?${searchParams({ query: escapeLucene(q), limit, offset })}`
      );
    },

    browseReleasesByLabel(mbid: string, { limit, offset }: PageParams) {
      return get<MBReleaseBrowseResponse>(
        `/release?${searchParams({
          label: mbid,
          inc: "artist-credits+labels+media",
          limit,
          offset,
        })}`
      );
    },

    browseReleasesByArtist(mbid: string, { limit, offset }: PageParams) {
      return get<MBReleaseBrowseResponse>(
        `/release?${searchParams({
          artist: mbid,
          inc: "artist-credits+labels+media",
          limit,
          offset,
        })}`
      );
    },

    lookupLabel(mbid: string) {
      return get<MBLabel>(`/label/${mbid}?${searchParams({})}`);
    },

    lookupArtist(mbid: string) {
      return get<MBArtist>(
        `/artist/${mbid}?${searchParams({ inc: "aliases" })}`
      );
    },

    lookupRelease(mbid: string) {
      return get<MBRelease>(
        `/release/${mbid}?${searchParams({
          inc: "artist-credits+labels+media",
        })}`
      );
    },
  };
}

export type MusicBrainzClient = ReturnType<typeof createMusicBrainzClient>;

// Singleton surviving dev HMR.
const GLOBAL_KEY = Symbol.for("dig.musicbrainz.client");
const g = globalThis as Record<symbol, unknown>;

export const musicBrainzClient: MusicBrainzClient =
  (g[GLOBAL_KEY] as MusicBrainzClient | undefined) ??
  (g[GLOBAL_KEY] = createMusicBrainzClient());
