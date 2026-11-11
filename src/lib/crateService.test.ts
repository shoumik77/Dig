import { describe, expect, it, vi } from "vitest";
import { createCrateService } from "./crateService";
import { GraphServiceError } from "./graphErrors";
import type { MusicEntity } from "@/types/music";

const CRATE_ID = "crate:9c7f9d2a-1e4b-4f5a-8c3d-2b6a7e8f9a0b";
const ENTITY: MusicEntity = {
  id: "mb:label:29c1256a-d989-4035-a856-95d707e2082c",
  name: "Strictly Rhythm",
  type: "label",
  provenance: "verified",
};

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

describe("createCrateService", () => {
  it("lists crates from GET /api/crates and unwraps the envelope", async () => {
    const crates = [{ id: CRATE_ID, name: "digs", itemCount: 2 }];
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope(crates));
    const svc = createCrateService({ fetchImpl });
    expect(await svc.list()).toEqual(crates);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("/api/crates");
    expect(init?.method ?? "GET").toBe("GET");
  });

  it("creates a crate with a JSON body", async () => {
    const crate = { id: CRATE_ID, name: "House" };
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope(crate));
    const svc = createCrateService({ fetchImpl });
    expect(await svc.create("House")).toEqual(crate);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("/api/crates");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(JSON.stringify({ name: "House" }));
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json"
    );
  });

  it("encodes the crate id in detail, rename, and delete paths", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope({ id: CRATE_ID }));
    const svc = createCrateService({ fetchImpl });
    await svc.getDetail(CRATE_ID);
    await svc.rename(CRATE_ID, "New name");
    await svc.remove(CRATE_ID);
    const enc = encodeURIComponent(CRATE_ID);
    expect(String(fetchImpl.mock.calls[0][0])).toBe(`/api/crates/${enc}`);
    expect(String(fetchImpl.mock.calls[1][0])).toBe(`/api/crates/${enc}`);
    expect(fetchImpl.mock.calls[1][1]?.method).toBe("PATCH");
    expect(fetchImpl.mock.calls[1][1]?.body).toBe(
      JSON.stringify({ name: "New name" })
    );
    expect(String(fetchImpl.mock.calls[2][0])).toBe(`/api/crates/${enc}`);
    expect(fetchImpl.mock.calls[2][1]?.method).toBe("DELETE");
  });

  it("posts item snapshots and encodes entity ids on removal", async () => {
    const item = { crateId: CRATE_ID, entityId: ENTITY.id, entity: ENTITY };
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope(item));
    const svc = createCrateService({ fetchImpl });
    await svc.saveItem(CRATE_ID, ENTITY);
    const [saveUrl, saveInit] = fetchImpl.mock.calls[0];
    expect(String(saveUrl)).toBe(
      `/api/crates/${encodeURIComponent(CRATE_ID)}/items`
    );
    expect(saveInit?.method).toBe("POST");
    expect(saveInit?.body).toBe(JSON.stringify({ entity: ENTITY }));

    await svc.removeItem(CRATE_ID, ENTITY.id);
    const [delUrl, delInit] = fetchImpl.mock.calls[1];
    expect(String(delUrl)).toBe(
      `/api/crates/${encodeURIComponent(CRATE_ID)}/items/${encodeURIComponent(ENTITY.id)}`
    );
    expect(delInit?.method).toBe("DELETE");
  });

  it("maps error envelopes to GraphServiceError with kind and message", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      errEnvelope(404, { kind: "not_found", message: "crate missing" })
    );
    const svc = createCrateService({ fetchImpl });
    const err = await svc.getDetail(CRATE_ID).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(GraphServiceError);
    expect(err).toMatchObject({ kind: "not_found", message: "crate missing" });
  });

  it("treats a 200 envelope with ok:false as an error", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            ok: false,
            error: { kind: "invalid", message: "bad name" },
          }),
      } as Response)
    );
    const svc = createCrateService({ fetchImpl });
    await expect(svc.create("")).rejects.toMatchObject({
      kind: "invalid",
      message: "bad name",
    });
  });

  it("maps fetch failures to network errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.reject(new TypeError("offline"))
    );
    const svc = createCrateService({ fetchImpl });
    await expect(svc.list()).rejects.toMatchObject({ kind: "network" });
  });

  it("maps unparseable bodies to upstream errors", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("nope")),
      } as Response)
    );
    const svc = createCrateService({ fetchImpl });
    await expect(svc.list()).rejects.toMatchObject({ kind: "upstream" });
  });

  it("honors a custom baseUrl", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => okEnvelope([]));
    const svc = createCrateService({ fetchImpl, baseUrl: "/x/crates" });
    await svc.list();
    expect(String(fetchImpl.mock.calls[0][0])).toBe("/x/crates");
  });
});
