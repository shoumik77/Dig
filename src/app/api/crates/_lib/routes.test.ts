import { describe, expect, it, vi } from "vitest";
import { GraphServiceError } from "@/lib/graphErrors";
import type { Crate, CrateDetail, CrateSummary } from "@/types/crate";
import type { MusicEntity } from "@/types/music";

const store = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  getDetail: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  saveItem: vi.fn(),
  removeItem: vi.fn(),
}));

vi.mock("@/server/crates/store", () => ({ crateStore: store }));

import { GET as listGET, POST as createPOST } from "../route";
import {
  DELETE as crateDELETE,
  GET as detailGET,
  PATCH as renamePATCH,
} from "../[crateId]/route";
import { POST as savePOST } from "../[crateId]/items/route";
import { DELETE as unsaveDELETE } from "../[crateId]/items/[entityId]/route";

const CRATE: Crate = {
  id: "crate:abc",
  name: "House",
  createdAt: 1,
  updatedAt: 1,
};

const SUMMARY: CrateSummary = { ...CRATE, itemCount: 2 };

const DETAIL: CrateDetail = { ...CRATE, items: [] };

const ENTITY: MusicEntity = {
  id: "mb:label:29c1256a-d989-4035-a856-95d707e2082c",
  name: "Strictly Rhythm",
  type: "label",
  provenance: "verified",
};

function crateCtx(crateId: string) {
  return { params: Promise.resolve({ crateId }) };
}

function itemCtx(crateId: string, entityId: string) {
  return { params: Promise.resolve({ crateId, entityId }) };
}

function post(url: string, body: unknown) {
  return new Request(url, { method: "POST", body: JSON.stringify(body) });
}

function patch(url: string, body: unknown) {
  return new Request(url, { method: "PATCH", body: JSON.stringify(body) });
}

describe("api/crates routes", () => {
  it("GET /api/crates returns the envelope with no-store", async () => {
    store.list.mockReturnValue([SUMMARY]);
    const res = await listGET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: [SUMMARY] });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("POST /api/crates creates a crate", async () => {
    store.create.mockReturnValue(CRATE);
    const res = await createPOST(
      post("http://localhost/api/crates", { name: "House" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: CRATE });
    expect(store.create).toHaveBeenCalledWith("House");
  });

  it("POST /api/crates 400s on invalid JSON and invalid names", async () => {
    let res = await createPOST(
      new Request("http://localhost/api/crates", {
        method: "POST",
        body: "not json{",
      })
    );
    expect(res.status).toBe(400);
    store.create.mockImplementation(() => {
      throw new GraphServiceError("invalid", "Crate name must be 1-80 characters");
    });
    res = await createPOST(
      post("http://localhost/api/crates", { name: "" })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.kind).toBe("invalid");
  });

  it("GET detail returns 404 for unknown crates", async () => {
    store.getDetail.mockImplementation(() => {
      throw new GraphServiceError("not_found", "Crate not found");
    });
    const res = await detailGET(
      new Request("http://localhost/api/crates/crate:nope"),
      crateCtx("crate:nope")
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.kind).toBe("not_found");
  });

  it("GET detail returns CrateDetail", async () => {
    store.getDetail.mockReturnValue(DETAIL);
    const res = await detailGET(
      new Request("http://localhost/api/crates/crate:abc"),
      crateCtx("crate:abc")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: DETAIL });
  });

  it("PATCH renames a crate", async () => {
    store.rename.mockReturnValue({ ...CRATE, name: "Garage" });
    const res = await renamePATCH(
      patch("http://localhost/api/crates/crate:abc", { name: "Garage" }),
      crateCtx("crate:abc")
    );
    expect(res.status).toBe(200);
    expect(store.rename).toHaveBeenCalledWith("crate:abc", "Garage");
  });

  it("DELETE removes a crate", async () => {
    store.remove.mockReturnValue({ id: "crate:abc" });
    const res = await crateDELETE(
      new Request("http://localhost/api/crates/crate:abc", {
        method: "DELETE",
      }),
      crateCtx("crate:abc")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { id: "crate:abc" } });
  });

  it("POST items saves an entity and 400s on a bad entity", async () => {
    const item = {
      crateId: CRATE.id,
      entityId: ENTITY.id,
      entity: ENTITY,
      addedAt: 5,
    };
    store.saveItem.mockReturnValue(item);
    let res = await savePOST(
      post("http://localhost/api/crates/crate:abc/items", { entity: ENTITY }),
      crateCtx("crate:abc")
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: item });
    expect(store.saveItem).toHaveBeenCalledWith("crate:abc", ENTITY);

    store.saveItem.mockImplementation(() => {
      throw new GraphServiceError("invalid", "Invalid entity");
    });
    res = await savePOST(
      post("http://localhost/api/crates/crate:abc/items", { entity: {} }),
      crateCtx("crate:abc")
    );
    expect(res.status).toBe(400);
  });

  it("DELETE items removes an entity and 404s when missing", async () => {
    store.removeItem.mockReturnValue({ entityId: ENTITY.id });
    const res = await unsaveDELETE(
      new Request(
        `http://localhost/api/crates/crate:abc/items/${encodeURIComponent(ENTITY.id)}`,
        { method: "DELETE" }
      ),
      itemCtx("crate:abc", ENTITY.id)
    );
    expect(res.status).toBe(200);
    expect(store.removeItem).toHaveBeenCalledWith("crate:abc", ENTITY.id);

    store.removeItem.mockImplementation(() => {
      throw new GraphServiceError("not_found", "Item not found");
    });
    const missing = await unsaveDELETE(
      new Request("http://localhost/api/crates/crate:abc/items/x", {
        method: "DELETE",
      }),
      itemCtx("crate:abc", "x")
    );
    expect(missing.status).toBe(404);
  });

  it("unknown errors become a generic 500", async () => {
    store.list.mockImplementation(() => {
      throw new Error("db exploded");
    });
    const res = await listGET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.message).not.toContain("db exploded");
  });
});
