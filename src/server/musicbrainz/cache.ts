export interface LruCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
  readonly size: number;
  clear(): void;
}

interface LruCacheOptions {
  max: number;
  ttlMs: number;
  now?: () => number;
}

export function createLruCache<V>(options: LruCacheOptions): LruCache<V> {
  const { max, ttlMs } = options;
  const now = options.now ?? Date.now;
  const entries = new Map<string, { value: V; expiresAt: number }>();

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      // refresh recency
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },

    set(key, value) {
      entries.delete(key);
      entries.set(key, { value, expiresAt: now() + ttlMs });
      while (entries.size > max) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },

    delete(key) {
      entries.delete(key);
    },

    get size() {
      return entries.size;
    },

    clear() {
      entries.clear();
    },
  };
}
