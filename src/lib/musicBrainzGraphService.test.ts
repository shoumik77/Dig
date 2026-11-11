import { describe, expect, it, vi } from "vitest";
import { createMusicBrainzGraphService } from "./musicBrainzGraphService";
import { GraphServiceError } from "./graphErrors";

const UUID = "29c1256a-d989-4035-a856-95d707e2082c";

function okEnvelope(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve({ ok: status < 400, data }),
  } as Response);
}

function errEnvelope(
  status: number,
  error: { kind: string; message: string; retryAfterMs?: number }
) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ ok: false, error }),
  } as Response);
}

describe("createMusicBrainzGraphService", () => {
  it("has providerId musicbrainz and a null default root", async () => {
    const svc = createMusicBrainzGraphService({ fetchImpl: vi.fn() });
    expect(svc.providerId).toBe("musicbrainz");
    expect(await svc.getDefaultRootId()).toBeNull();
  });

  it("builds entity URLs from mb ids and unwraps the envelope", async () => {
    const entity = { id: `mb:label:${UUID}`, name: "SR" };
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope(entity));
    const svc = createMusicBrainzGraphService({ fetchImpl });
    const res = await svc.getEntity(`mb:label:${UUID}`);
    expect(res?.name).toBe("SR");
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      `/api/music/entities/label/${UUID}`
    );
  });

  it("returns undefined for non-mb ids and 404 entities", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      errEnvelope(404, { kind: "not_found", message: "missing" })
    );
    const svc = createMusicBrainzGraphService({ fetchImpl });
    expect(await svc.getEntity("label:strictly-rhythm")).toBeUndefined();
    expect(await svc.getEntity(`mb:label:${UUID}`)).toBeUndefined();
  });

  it("passes cursor and limit on connections", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      okEnvelope({ entities: [], relationships: [], nextCursor: null, total: 0 })
    );
    const svc = createMusicBrainzGraphService({ fetchImpl });
    await svc.getConnections(`mb:artist:${UUID}`, {
      cursor: `${UUID}:24`,
      limit: 12,
    });
    const url = new URL(`http://x${String(fetchImpl.mock.calls[0][0])}`);
    expect(url.pathname).toBe(
      `/api/music/entities/artist/${UUID}/connections`
    );
    expect(url.searchParams.get("cursor")).toBe(`${UUID}:24`);
    expect(url.searchParams.get("limit")).toBe("12");
  });

  it("defaults search type to label and honors an explicit type", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      okEnvelope({ label: [], artist: [], "release-group": [], release: [], recording: [] })
    );
    const svc = createMusicBrainzGraphService({ fetchImpl });
    await svc.searchEntities("hello");
    let url = new URL(`http://x${String(fetchImpl.mock.calls[0][0])}`);
    expect(url.searchParams.get("type")).toBe("label");
    await svc.searchEntities("hello", { type: "artist" });
    url = new URL(`http://x${String(fetchImpl.mock.calls[1][0])}`);
    expect(url.searchParams.get("type")).toBe("artist");
    expect(url.searchParams.get("q")).toBe("hello");
  });

  it("maps error envelopes to GraphServiceError with kind", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      errEnvelope(429, {
        kind: "rate_limited",
        message: "slow",
        retryAfterMs: 2000,
      })
    );
    const svc = createMusicBrainzGraphService({ fetchImpl });
    const err = await svc
      .getEntity(`mb:release:${UUID}`)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GraphServiceError);
    expect(err).toMatchObject({ kind: "rate_limited", retryAfterMs: 2000 });
  });

  it("maps fetch failures to network errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.reject(new TypeError("offline")));
    const svc = createMusicBrainzGraphService({ fetchImpl });
    await expect(
      svc.searchEntities("x", { type: "release" })
    ).rejects.toMatchObject({ kind: "network" });
  });
});

describe("enrichment endpoints", () => {
  it("getEnrichment hits /enrich/{type}/{mbid} and unwraps", async () => {
    const data = { kind: "release", id: 7, url: "u" };
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope(data));
    const svc = createMusicBrainzGraphService({ fetchImpl });
    const res = await svc.getEnrichment(`mb:release:${UUID}`);
    expect(res).toEqual(data);
    expect(String(fetchImpl.mock.calls[0][0])).toBe(
      `/api/music/enrich/release/${UUID}`
    );
  });

  it("getEnrichment returns null for recordings and non-mb ids", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope(null));
    const svc = createMusicBrainzGraphService({ fetchImpl });
    expect(await svc.getEnrichment(`mb:recording:${UUID}`)).toBeNull();
    expect(await svc.getEnrichment("label:strictly-rhythm")).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("getCapabilities hits /capabilities", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      okEnvelope({ discogs: true })
    );
    const svc = createMusicBrainzGraphService({ fetchImpl });
    expect(await svc.getCapabilities()).toEqual({ discogs: true });
    expect(String(fetchImpl.mock.calls[0][0])).toBe("/api/music/capabilities");
  });
});
