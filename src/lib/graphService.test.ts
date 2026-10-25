import { describe, expect, it } from "vitest";
import {
  createMockGraphService,
  DEFAULT_PAGE_SIZE,
} from "./graphService";
import { mockMusic } from "@/data/mockMusic";

const service = createMockGraphService(mockMusic);

describe("createMockGraphService", () => {
  it("returns connections where the id is the source", async () => {
    // release -> label (released_on) and release -> artist (performed_by)
    const page = await service.getConnections("release:deep-inside", { limit: 50 });
    const names = page.entities.map((e) => e.id);
    expect(names).toContain("label:strictly-rhythm");
    expect(names).toContain("artist:hardrive");
    expect(names).toContain("artist:louie-vega");
  });

  it("returns connections where the id is the target", async () => {
    // artist is target of performed_by edges
    const page = await service.getConnections("artist:barbara-tucker", { limit: 50 });
    const releaseIds = page.entities.map((e) => e.id);
    expect(releaseIds).toContain("release:beautiful-people");
    expect(releaseIds).toContain("release:i-get-lifted");
    expect(releaseIds).toContain("release:stay-together");
  });

  it("returns an empty page for an unknown id", async () => {
    const page = await service.getConnections("nope:not-real");
    expect(page).toEqual({
      entities: [],
      relationships: [],
      nextCursor: null,
      total: 0,
    });
  });

  it("pages Strictly Rhythm at exactly DEFAULT_PAGE_SIZE", async () => {
    const page = await service.getConnections("label:strictly-rhythm", {
      limit: DEFAULT_PAGE_SIZE,
    });
    expect(page.entities).toHaveLength(DEFAULT_PAGE_SIZE);
    expect(page.total).toBeGreaterThan(DEFAULT_PAGE_SIZE);
    expect(page.nextCursor).not.toBeNull();
  });

  it("walks cursors to completion with no overlapping ids", async () => {
    const seen = new Set<string>();
    let cursor: string | null = null;
    let total = 0;
    do {
      const page = await service.getConnections("label:strictly-rhythm", {
        cursor,
        limit: DEFAULT_PAGE_SIZE,
      });
      for (const e of page.entities) {
        expect(seen.has(e.id)).toBe(false);
        seen.add(e.id);
      }
      total = page.total;
      cursor = page.nextCursor;
    } while (cursor !== null);
    expect(seen.size).toBe(total);
  });

  it("returns a stable ordering across calls", async () => {
    const a = await service.getConnections("label:strictly-rhythm", { limit: 50 });
    const b = await service.getConnections("label:strictly-rhythm", { limit: 50 });
    expect(a.entities.map((e) => e.id)).toEqual(b.entities.map((e) => e.id));
    // ordering: by relationship type, then entity name
    const types = a.relationships.map((r) => r.type);
    expect([...types].sort()).toEqual(types);
  });

  it("resolves the default root to Strictly Rhythm", async () => {
    expect(await service.getDefaultRootId()).toBe("label:strictly-rhythm");
    const entity = await service.getEntity("label:strictly-rhythm");
    expect(entity?.name).toBe("Strictly Rhythm");
  });
});
