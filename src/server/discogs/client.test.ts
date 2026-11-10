import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiscogsClient } from "./client";
import { DISCOGS_ORIGIN } from "./config";

function okJson(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe("createDiscogsClient", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("requests the right paths and sends token + UA headers", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return okJson({ id: 1 });
    }) as unknown as typeof fetch;
    const client = createDiscogsClient({ fetchImpl, token: "TESTTOKEN" });

    const p = client.getRelease(750726);
    await vi.advanceTimersByTimeAsync(0);
    await p;
    const p2 = client.getMaster(401133);
    await vi.advanceTimersByTimeAsync(1100);
    await p2;
    const p3 = client.getArtist(161487);
    await vi.advanceTimersByTimeAsync(1100);
    await p3;
    const p4 = client.getLabel(609);
    await vi.advanceTimersByTimeAsync(1100);
    await p4;

    expect(calls[0].url).toBe(`${DISCOGS_ORIGIN}/releases/750726`);
    expect(calls[1].url).toBe(`${DISCOGS_ORIGIN}/masters/401133`);
    expect(calls[2].url).toBe(`${DISCOGS_ORIGIN}/artists/161487`);
    expect(calls[3].url).toBe(`${DISCOGS_ORIGIN}/labels/609`);
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Discogs token=TESTTOKEN");
    expect(headers["User-Agent"]).toContain("Dig/0.2.0");
  });

  it("omits the Authorization header when no token is set", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return okJson({});
    }) as unknown as typeof fetch;
    const client = createDiscogsClient({ fetchImpl, token: undefined });
    const p = client.getRelease(1);
    await vi.advanceTimersByTimeAsync(0);
    await p;
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
    expect(headers["User-Agent"]).toContain("Dig/0.2.0");
  });

  it("serves repeated lookups from cache", async () => {
    const fetchImpl = vi.fn(() => okJson({ id: 7 })) as unknown as typeof fetch;
    const client = createDiscogsClient({ fetchImpl, token: "x" });
    const p = client.getLabel(609);
    await vi.advanceTimersByTimeAsync(0);
    await p;
    expect(await client.getLabel(609)).toEqual({ id: 7 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
