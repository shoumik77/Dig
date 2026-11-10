export const DISCOGS_ORIGIN = "https://api.discogs.com";

export const discogsToken = process.env.DISCOGS_TOKEN || undefined;

export const userAgent =
  process.env.DISCOGS_USER_AGENT ??
  "Dig/0.2.0 +https://github.com/shoumik77/Dig";

// Discogs allows 60 req/min with a token; ~54/min leaves headroom.
export const minIntervalMs = 1100;
export const timeoutMs = 10_000;
export const cacheTtlMs =
  Number(process.env.DISCOGS_CACHE_TTL_MS) || 3_600_000;
export const cacheMax = 500;
export const maxQueue = 50;
export const maxRetries = 2;

export function isDiscogsEnabled(): boolean {
  return Boolean(process.env.DISCOGS_TOKEN);
}
