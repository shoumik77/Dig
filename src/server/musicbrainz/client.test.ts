import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMusicBrainzClient, escapeLucene } from "./client";
import { MB_ORIGIN } from "./config";

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe("escapeLucene", () => {
  it("escapes Lucene special characters", () => {
    expect(escapeLucene('a+b (c) "d" x/y')).toBe('a\\+b \\(c\\) \\"d\\" x\\/y');
    expect(escapeLucene("a && b || c")).toBe("a \\&& b \\|| c");
    expect(escapeLucene("plain name")).toBe("plain name");
  });
});

describe("createMusicBrainzClient", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("builds search URLs with escaped query, paging, and fmt=json", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      okJson({ count: 0, offset: 0, labels: [] })
    );
    const client = createMusicBrainzClient({ fetchImpl });
    const p = client.searchLabels("Strictly+Rhythm", { limit: 5, offset: 10 });
    await vi.advanceTimersByTimeAsync(0);
    const res = await p;
    expect(res.labels).toEqual([]);
    const url = new URL(String(fetchImpl.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe(`${MB_ORIGIN}/label`);
    expect(url.searchParams.get("query")).toBe("Strictly\\+Rhythm");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("offset")).toBe("10");
    expect(url.searchParams.get("fmt")).toBe("json");
  });

  it("builds browse and lookup URLs with the right inc params", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn<typeof fetch>((u) => {
      urls.push(String(u));
      return okJson({});
    });
    const client = createMusicBrainzClient({ fetchImpl });

    const p1 = client.browseReleasesByLabel("mbid-1", { limit: 3, offset: 0 });
    await vi.advanceTimersByTimeAsync(0);
    await p1;
    const p2 = client.lookupArtist("mbid-2");
    await vi.advanceTimersByTimeAsync(1000);
    await p2;
    const p3 = client.lookupRelease("mbid-3");
    await vi.advanceTimersByTimeAsync(1000);
    await p3;

    expect(urls[0]).toContain("/release?");
    expect(urls[0]).toContain("label=mbid-1");
    expect(urls[0]).toContain("inc=artist-credits%2Blabels%2Bmedia");
    expect(urls[1]).toContain("/artist/mbid-2");
    expect(urls[1]).toContain("inc=aliases");
    expect(urls[2]).toContain("/release/mbid-3");
    expect(urls[2]).toContain("inc=artist-credits%2Blabels%2Bmedia");
  });

  it("serves a repeated request from cache without a second fetch", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => okJson({ id: "x" }));
    const client = createMusicBrainzClient({ fetchImpl });
    const p = client.lookupLabel("mbid-1");
    await vi.advanceTimersByTimeAsync(0);
    await p;
    const again = await client.lookupLabel("mbid-1");
    expect(again).toEqual({ id: "x" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
