import { describe, expect, it } from "vitest";
import { createLruCache } from "./cache";

function makeCache(max = 3, ttlMs = 1000) {
  let t = 0;
  const cache = createLruCache<number>({ max, ttlMs, now: () => t });
  return { cache, tick: (ms: number) => (t += ms) };
}

describe("createLruCache", () => {
  it("returns stored values and undefined for misses", () => {
    const { cache } = makeCache();
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("nope")).toBeUndefined();
  });

  it("expires entries after the TTL", () => {
    const { cache, tick } = makeCache();
    cache.set("a", 1);
    tick(999);
    expect(cache.get("a")).toBe(1);
    tick(1);
    expect(cache.get("a")).toBeUndefined();
  });

  it("evicts the least recently used entry at max", () => {
    const { cache } = makeCache(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.size).toBe(2);
  });

  it("get refreshes recency", () => {
    const { cache } = makeCache(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1); // a now most-recent
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
  });

  it("set on an existing key refreshes value and recency", () => {
    const { cache } = makeCache(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("a", 10);
    cache.set("c", 3);
    expect(cache.get("a")).toBe(10);
    expect(cache.get("b")).toBeUndefined();
  });
});
