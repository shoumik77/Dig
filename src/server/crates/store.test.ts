import { describe, expect, it } from "vitest";
import { GraphServiceError } from "@/lib/graphErrors";
import type { MusicEntity } from "@/types/music";
import { openDb } from "./db";
import { createCrateStore } from "./store";

const ENTITY: MusicEntity = {
  id: "mb:label:29c1256a-d989-4035-a856-95d707e2082c",
  name: "Strictly Rhythm",
  type: "label",
  provenance: "verified",
};

const DEMO_ENTITY: MusicEntity = {
  id: "label:strictly-rhythm",
  name: "Strictly Rhythm",
  type: "label",
  provenance: "demo",
};

function store() {
  return createCrateStore(openDb(":memory:"));
}

describe("crateStore", () => {
  it("creates crates and lists them with counts in creation order", () => {
    const s = store();
    const a = s.create("House");
    const b = s.create("  Garage  ");
    expect(a.id).toMatch(/^crate:/);
    expect(b.name).toBe("Garage");
    const list = s.list();
    expect(list.map((c) => c.id)).toEqual([a.id, b.id]);
    expect(list[0].itemCount).toBe(0);
  });

  it("rejects empty, over-long, and non-string names", () => {
    const s = store();
    for (const bad of ["", "   ", "x".repeat(81), 42, null]) {
      expect(() => s.create(bad)).toThrowError(GraphServiceError);
    }
    try {
      s.create("");
    } catch (err) {
      expect((err as GraphServiceError).kind).toBe("invalid");
    }
  });

  it("saves items and returns them in getDetail", () => {
    const s = store();
    const c = s.create("Crate");
    s.saveItem(c.id, ENTITY);
    s.saveItem(c.id, DEMO_ENTITY);
    const detail = s.getDetail(c.id);
    expect(detail.items.map((i) => i.entityId).sort()).toEqual(
      [ENTITY.id, DEMO_ENTITY.id].sort()
    );
    expect(detail.items[0].entity.name).toBe("Strictly Rhythm");
    expect(s.list()[0].itemCount).toBe(2);
  });

  it("upserts a repeated save instead of duplicating", () => {
    const s = store();
    const c = s.create("Crate");
    const first = s.saveItem(c.id, ENTITY);
    const second = s.saveItem(c.id, { ...ENTITY, name: "Strictly Rhythm (SR)" });
    expect(second.addedAt).toBeGreaterThanOrEqual(first.addedAt);
    const detail = s.getDetail(c.id);
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].entity.name).toBe("Strictly Rhythm (SR)");
  });

  it("rejects malformed entities and unknown crates", () => {
    const s = store();
    const c = s.create("Crate");
    expect(() => s.saveItem(c.id, { id: "x" })).toThrowError(GraphServiceError);
    expect(() =>
      s.saveItem(c.id, { ...ENTITY, type: "work" as never })
    ).toThrowError(GraphServiceError);
    expect(() => s.saveItem("crate:nope", ENTITY)).toThrowError(
      GraphServiceError
    );
    try {
      s.saveItem("crate:nope", ENTITY);
    } catch (err) {
      expect((err as GraphServiceError).kind).toBe("not_found");
    }
  });

  it("removes items and reports unknown items as not_found", () => {
    const s = store();
    const c = s.create("Crate");
    s.saveItem(c.id, ENTITY);
    expect(s.removeItem(c.id, ENTITY.id)).toEqual({ entityId: ENTITY.id });
    expect(s.getDetail(c.id).items).toHaveLength(0);
    try {
      s.removeItem(c.id, ENTITY.id);
    } catch (err) {
      expect((err as GraphServiceError).kind).toBe("not_found");
    }
  });

  it("renames crates and bumps updatedAt", async () => {
    const s = store();
    const c = s.create("Old");
    await new Promise((r) => setTimeout(r, 2));
    const renamed = s.rename(c.id, "New");
    expect(renamed.name).toBe("New");
    expect(renamed.updatedAt).toBeGreaterThanOrEqual(c.updatedAt);
  });

  it("cascades item deletion when a crate is removed", () => {
    const s = store();
    const c = s.create("Crate");
    s.saveItem(c.id, ENTITY);
    expect(s.remove(c.id)).toEqual({ id: c.id });
    expect(s.list()).toHaveLength(0);
    try {
      s.getDetail(c.id);
    } catch (err) {
      expect((err as GraphServiceError).kind).toBe("not_found");
    }
  });
});
