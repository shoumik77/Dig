import { describe, expect, it, vi } from "vitest";
import { GraphServiceError } from "@/lib/graphErrors";
import type { SearchResults } from "@/types/graph";
import type { MusicEntity } from "@/types/music";

const service = vi.hoisted(() => ({
  search: vi.fn(),
  getEntity: vi.fn(),
  getConnections: vi.fn(),
}));

vi.mock("@/server/musicbrainz/service", () => ({
  musicBrainzServerService: service,
}));

import { GET as searchGET } from "../search/route";
import { GET as entityGET } from "../entities/[type]/[id]/route";
import { GET as connectionsGET } from "../entities/[type]/[id]/connections/route";

const UUID = "29c1256a-d989-4035-a856-95d707e2082c";

function ctx(type: string, id: string) {
  return { params: Promise.resolve({ type, id }) };
}

const EMPTY: SearchResults = { labels: [], artists: [], releases: [] };
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
      new Request("http://localhost/api/music/search?q=x&type=foo")
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.kind).toBe("invalid");
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

    service.getEntity.mockRejectedValue(
      new GraphServiceError("upstream", "mb exploded")
    );
    res = await entityGET(
      new Request(`http://localhost/api/music/entities/label/${UUID}`),
      ctx("label", UUID)
    );
    expect(res.status).toBe(502);
    expect((await res.json()).error.kind).toBe("upstream");
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
});
