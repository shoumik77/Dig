import { describe, expect, it } from "vitest";
import {
  graphReducer,
  hasMore,
  initialGraphState,
  isExpanded,
  neighborsOf,
  type GraphState,
} from "./graphState";
import { createMockGraphService, DEFAULT_PAGE_SIZE } from "./graphService";
import { mockMusic } from "@/data/mockMusic";
import type { ConnectionsPage } from "@/types/graph";
import type { MusicEntity } from "@/types/music";

const service = createMockGraphService(mockMusic);

const ROOT_ID = "label:strictly-rhythm";

async function initState(): Promise<GraphState> {
  const root = (await service.getEntity(ROOT_ID)) as MusicEntity;
  return graphReducer(initialGraphState, { type: "INIT_FROM", entity: root });
}

async function firstPage(id: string): Promise<ConnectionsPage> {
  return service.getConnections(id, { limit: DEFAULT_PAGE_SIZE });
}

describe("graphReducer", () => {
  it("init shows only the root, nothing expanded", async () => {
    const state = await initState();
    expect(Object.keys(state.nodes)).toEqual([ROOT_ID]);
    expect(state.edges).toEqual({});
    expect(state.expansions).toEqual({});
    expect(state.selectedId).toBe(ROOT_ID);
    expect(state.rootId).toBe(ROOT_ID);
    expect(isExpanded(state, ROOT_ID)).toBe(false);
  });

  it("EXPAND adds exactly the page's entities/edges and records the expansion", async () => {
    let state = await initState();
    const page = await firstPage(ROOT_ID);
    state = graphReducer(state, { type: "EXPAND", id: ROOT_ID, page });

    expect(Object.keys(state.nodes)).toHaveLength(1 + page.entities.length);
    expect(Object.keys(state.edges)).toHaveLength(page.relationships.length);
    const expansion = state.expansions[ROOT_ID];
    expect(expansion.loaded).toBe(DEFAULT_PAGE_SIZE);
    expect(expansion.total).toBe(page.total);
    expect(expansion.nextCursor).toBe(page.nextCursor);
    expect(hasMore(state, ROOT_ID)).toBe(true);
  });

  it("EXPAND_START sets status loading and creates a record", async () => {
    let state = await initState();
    state = graphReducer(state, { type: "EXPAND_START", id: ROOT_ID });
    expect(state.expansions[ROOT_ID]).toEqual({
      loaded: 0,
      total: 0,
      nextCursor: null,
      status: "loading",
    });
  });

  it("repeated EXPAND with the same page keeps identical counts (dedupe)", async () => {
    let state = await initState();
    const page = await firstPage(ROOT_ID);
    state = graphReducer(state, { type: "EXPAND", id: ROOT_ID, page });
    const nodeCount = Object.keys(state.nodes).length;
    const edgeCount = Object.keys(state.edges).length;
    const loaded = state.expansions[ROOT_ID].loaded;

    state = graphReducer(state, { type: "EXPAND", id: ROOT_ID, page });
    expect(Object.keys(state.nodes)).toHaveLength(nodeCount);
    expect(Object.keys(state.edges)).toHaveLength(edgeCount);
    expect(state.expansions[ROOT_ID].loaded).toBe(loaded);
  });

  it("LOAD_MORE appends page 2; hasMore false and loaded === total at the end", async () => {
    let state = await initState();
    const page1 = await firstPage(ROOT_ID);
    state = graphReducer(state, { type: "EXPAND", id: ROOT_ID, page: page1 });
    expect(page1.nextCursor).not.toBeNull();

    const page2 = await service.getConnections(ROOT_ID, {
      cursor: page1.nextCursor,
      limit: DEFAULT_PAGE_SIZE,
    });
    state = graphReducer(state, { type: "LOAD_MORE", id: ROOT_ID, page: page2 });

    const nodeIds = new Set([
      ...page1.entities.map((e) => e.id),
      ...page2.entities.map((e) => e.id),
    ]);
    expect(Object.keys(state.nodes)).toHaveLength(1 + nodeIds.size);
    expect(state.expansions[ROOT_ID].loaded).toBe(page1.total);
    expect(hasMore(state, ROOT_ID)).toBe(false);
    expect(state.expansions[ROOT_ID].status).toBe("done");
  });

  it("chained label -> release -> artist keeps earlier nodes", async () => {
    let state = await initState();
    const labelPage = await firstPage(ROOT_ID);
    state = graphReducer(state, { type: "EXPAND", id: ROOT_ID, page: labelPage });

    const releasePage = await service.getConnections("release:deep-inside", {
      limit: DEFAULT_PAGE_SIZE,
    });
    state = graphReducer(state, {
      type: "EXPAND",
      id: "release:deep-inside",
      page: releasePage,
    });

    // release page contains label + artists; expanding the artist next
    const artistPage = await service.getConnections("artist:hardrive", {
      limit: DEFAULT_PAGE_SIZE,
    });
    state = graphReducer(state, {
      type: "EXPAND",
      id: "artist:hardrive",
      page: artistPage,
    });

    expect(state.nodes[ROOT_ID]).toBeDefined();
    expect(state.nodes["release:deep-inside"]).toBeDefined();
    expect(state.nodes["artist:hardrive"]).toBeDefined();
    const neighbors = neighborsOf(state, "release:deep-inside").map((e) => e.id);
    expect(neighbors).toContain(ROOT_ID);
    expect(neighbors).toContain("artist:hardrive");
  });

  it("entity reachable from two parents appears once and parentOf keeps the first", async () => {
    let state = await initState();
    // Expand two releases that both connect to artist:louie-vega
    // (deep-inside produced_by, beautiful-people remixed_by, work produced_by)
    for (const releaseId of ["release:deep-inside", "release:work"]) {
      const page = await service.getConnections(releaseId, {
        limit: DEFAULT_PAGE_SIZE,
      });
      state = graphReducer(state, { type: "EXPAND", id: releaseId, page });
    }

    const occurrences = Object.values(state.nodes).filter(
      (e) => e.id === "artist:louie-vega"
    );
    expect(occurrences).toHaveLength(1);
    expect(state.parentOf["artist:louie-vega"]).toBe("release:deep-inside");
    // both edges exist though
    const edges = Object.values(state.edges).filter(
      (r) =>
        (r.source === "artist:louie-vega" || r.target === "artist:louie-vega")
    );
    expect(edges.length).toBeGreaterThanOrEqual(2);
  });

  it("RESET after multiple expansions leaves only the root", async () => {
    let state = await initState();
    const labelPage = await firstPage(ROOT_ID);
    state = graphReducer(state, { type: "EXPAND", id: ROOT_ID, page: labelPage });
    const releasePage = await service.getConnections("release:deep-inside", {
      limit: DEFAULT_PAGE_SIZE,
    });
    state = graphReducer(state, {
      type: "EXPAND",
      id: "release:deep-inside",
      page: releasePage,
    });
    expect(Object.keys(state.nodes).length).toBeGreaterThan(1);

    state = graphReducer(state, { type: "RESET" });
    expect(Object.keys(state.nodes)).toEqual([ROOT_ID]);
    expect(state.edges).toEqual({});
    expect(state.expansions).toEqual({});
    expect(state.selectedId).toBe(ROOT_ID);
    expect(state.parentOf).toEqual({});
  });
});
