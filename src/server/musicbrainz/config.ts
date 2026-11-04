export const MB_ORIGIN = "https://musicbrainz.org/ws/2";

export const userAgent =
  process.env.MUSICBRAINZ_USER_AGENT ??
  "Dig/0.2.0 (https://github.com/shoumik77/Dig)";

export const timeoutMs = 10_000;
export const cacheTtlMs =
  Number(process.env.MUSICBRAINZ_CACHE_TTL_MS) || 600_000;
export const cacheMax = 500;
export const maxQueue = 50;
export const maxRetries = 3;
export const minIntervalMs = 1000;
