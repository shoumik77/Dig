import { describe, expect, it, vi } from "vitest";
import { GraphServiceError } from "@/lib/graphErrors";
import type { SearchResults } from "@/types/graph";
import type { MusicEntity } from "@/types/music";

const service = vi.hoisted(() => ({
  search: vi.fn(),
  getEntity: vi.fn(),
  getConnections: vi.fn(),
}));

const discogs = vi.hoisted(() => ({
  getEnrichment: vi.fn(),
  getCapabilities: vi.fn(() => ({ discogs: true })),
}));

vi.mock("@/server/musicbrainz/service", () => ({
  musicBrainzServerService: service,
}));

vi.mock("@/server/discogs/service", () => ({
  getEnrichment: discogs.getEnrichment,
  getCapabilities: discogs.getCapabilities,
}));

import { GET as searchGET } from "../search/route";
import { GET as entityGET } from "../entities/[type]/[id]/route";
import { GET as connectionsGET } from "../entities/[type]/[id]/connections/route";
import { GET as enrichGET } from "../enrich/[type]/[id]/route";
import { GET as capabilitiesGET } from "../capabilities/route";

const UUID = "29c1256a-d989-4035-a856-95d707e2082c";

function ctx(type: string, id: string) {
  return { params: Promise.resolve({ type, id }) };
}

const EMPTY: SearchResults = {
  label: [],
  artist: [],
  "release-group": [],
  release: [],
  recording: [],
};
const ENTITY: MusicEntity = {
  id: `mb:label:${UUID}`,
  name: "Strictly Rhythm",
  type: "label",
  provenance: "verified",
};

describe("api/music routes", () => {
  it("search returns the envelope and clamps limit", async () => {
    service.search.mockResolvedValue(EMPTY);
    const res = await searchGET(
      new Request(
        "http://localhost/api/music/search?q=Strictly&type=label&limit=999"
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, data: EMPTY });
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=60");
    expect(service.search).toHaveBeenCalledWith("Strictly", "label", 25);
  });

  it("search 400s on missing q or bad type", async () => {
    let res = await searchGET(
      new Request("http://localhost/api/music/search?type=label")
    );
    expect(res.status).toBe(400);
    res = await searchGET(
      new Request("http://localhost/api/music/search?q=x&type=work")
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.kind).toBe("invalid");
  });

  it("search accepts all five entity types", async () => {
    service.search.mockResolvedValue(EMPTY);
    for (const type of [
      "label",
      "artist",
      "release-group",
      "release",
      "recording",
    ]) {
      const res = await searchGET(
        new Request(`http://localhost/api/music/search?q=x&type=${type}`)
      );
      expect(res.status).toBe(200);
    }
  });

  it("entity returns data or 404", async () => {
    service.getEntity.mockResolvedValue(ENTITY);
    let res = await entityGET(
      new Request(`http://localhost/api/music/entities/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.id).toBe(ENTITY.id);

    service.getEntity.mockResolvedValue(null);
    res = await entityGET(
      new Request(`http://localhost/api/music/entities/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(res.status).toBe(404);
  });

  it("entity 400s on bad type or bad uuid", async () => {
    let res = await entityGET(
      new Request(`http://localhost/api/music/entities/foo/${UUID}`),
      ctx("foo", UUID)
    );
    expect(res.status).toBe(400);
    res = await entityGET(
      new Request(`http://localhost/api/music/entities/work/${UUID}`),
      ctx("work", UUID)
    );
    expect(res.status).toBe(400);
    service.getEntity.mockResolvedValue(ENTITY);
    res = await entityGET(
      new Request(`http://localhost/api/music/entities/release-group/${UUID}`),
      ctx("release-group", UUID)
    );
    expect(res.status).toBe(200);
    res = await entityGET(
      new Request("http://localhost/api/music/entities/label/nope"),
      ctx("label", "nope")
    );
    expect(res.status).toBe(400);
  });

  it("connections passes cursor/limit and returns page", async () => {
    const page = {
      entities: [],
      relationships: [],
      nextCursor: `${UUID}:12`,
      total: 40,
    };
    service.getConnections.mockResolvedValue(page);
    const res = await connectionsGET(
      new Request(
        `http://localhost/api/music/entities/label/${UUID}/connections?cursor=${UUID}%3A12&limit=5`
      ),
      ctx("label", UUID)
    );
    expect(res.status).toBe(200);
    expect((await res.json()).data.nextCursor).toBe(`${UUID}:12`);
    expect(service.getConnections).toHaveBeenCalledWith("label", UUID, {
      cursor: `${UUID}:12`,
      limit: 5,
    });
  });

  it("connections 400s on invalid cursor from the service", async () => {
    service.getConnections.mockRejectedValue(
      new GraphServiceError("invalid", "bad cursor")
    );
    const res = await connectionsGET(
      new Request(
        `http://localhost/api/music/entities/label/${UUID}/connections?cursor=zzz`
      ),
      ctx("label", UUID)
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.kind).toBe("invalid");
  });

  it("maps rate_limited to 429 with Retry-After and upstream to 502", async () => {
    service.getEntity.mockRejectedValue(
      new GraphServiceError("rate_limited", "slow down", {
        retryAfterMs: 2500,
      })
    );
    let res = await entityGET(
      new Request(`http://localhost/api/music/entities/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3");
    let body = await res.json();
    expect(body.error.message).toBe(
      "MusicBrainz is rate limiting requests; try again shortly"
    );

    service.getEntity.mockRejectedValue(
      new GraphServiceError("upstream", "mb exploded")
    );
    res = await entityGET(
      new Request(`http://localhost/api/music/entities/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(res.status).toBe(502);
    body = await res.json();
    expect(body.error.kind).toBe("upstream");
    // internal message/URLs are not forwarded
    expect(body.error.message).toBe("MusicBrainz is unavailable");
  });

  it("unknown errors become a generic 500 with no internals", async () => {
    service.getEntity.mockRejectedValue(new Error("secret internals"));
    const res = await entityGET(
      new Request(`http://localhost/api/music/entities/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.kind).toBe("upstream");
    expect(JSON.stringify(body)).not.toContain("secret internals");
  });

  it("capabilities returns the discogs flag", async () => {
    const res = await capabilitiesGET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { discogs: true } });
  });

  it("enrich returns enrichment or null", async () => {
    const enrichment = { kind: "release", id: 1, url: "u" };
    discogs.getEnrichment.mockResolvedValue(enrichment);
    let res = await enrichGET(
      new Request(`http://localhost/api/music/enrich/release/${UUID}`),
      ctx("release", UUID)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: enrichment });
    expect(discogs.getEnrichment).toHaveBeenCalledWith(`mb:release:${UUID}`);

    discogs.getEnrichment.mockResolvedValue(null);
    res = await enrichGET(
      new Request(`http://localhost/api/music/enrich/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(await res.json()).toEqual({ ok: true, data: null });
  });

  it("enrich returns null for recordings without calling the service", async () => {
    discogs.getEnrichment.mockClear();
    const res = await enrichGET(
      new Request(`http://localhost/api/music/enrich/recording/${UUID}`),
      ctx("recording", UUID)
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: null });
    expect(discogs.getEnrichment).not.toHaveBeenCalled();
  });

  it("enrich 400s on bad type/id and maps service errors", async () => {
    let res = await enrichGET(
      new Request(`http://localhost/api/music/enrich/work/${UUID}`),
      ctx("work", UUID)
    );
    expect(res.status).toBe(400);
    res = await enrichGET(
      new Request("http://localhost/api/music/enrich/label/nope"),
      ctx("label", "nope")
    );
    expect(res.status).toBe(400);

    discogs.getEnrichment.mockRejectedValue(
      new GraphServiceError("rate_limited", "slow", { retryAfterMs: 2000 })
    );
    res = await enrichGET(
      new Request(`http://localhost/api/music/enrich/release/${UUID}`),
      ctx("release", UUID)
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("2");
  });
});
