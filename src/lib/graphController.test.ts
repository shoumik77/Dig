import { describe, expect, it, vi } from "vitest";
import { createGraphController } from "./graphController";
import type { GraphService } from "./graphService";
import {
  graphReducer,
  initialGraphState,
  type GraphAction,
  type GraphState,
} from "./graphState";
import type { ConnectionsPage, SearchResults } from "@/types/graph";
import type { MusicEntity } from "@/types/music";

function entity(id: string): MusicEntity {
  return { id, name: id, type: "label", provenance: "demo" };
}

function page(entities: MusicEntity[], rels: ConnectionsPage["relationships"], nextCursor: string | null = null, total?: number): ConnectionsPage {
  return {
    entities,
    relationships: rels,
    nextCursor,
    total: total ?? rels.length,
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(err: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeService(overrides: Partial<GraphService> = {}) {
  const { getConnections: impl, ...rest } = overrides;
  const getConnections = vi.fn(
    (id: string, q?: Parameters<GraphService["getConnections"]>[1]) =>
      impl ? impl(id, q) : Promise.resolve(page([], []))
  );
  const service: GraphService = {
    providerId: "demo",
    getEntity: (id) => Promise.resolve(entity(id)),
    getConnections,
    searchEntities: () =>
      Promise.resolve({ labels: [], artists: [], releases: [] } satisfies SearchResults),
    getDefaultRootId: () => Promise.resolve(null),
    ...rest,
  };
  return { service, getConnections };
}

function harness(service: GraphService) {
  let state: GraphState = initialGraphState;
  const dispatch = (a: GraphAction) => {
    state = graphReducer(state, a);
  };
  const controller = createGraphController({
    service,
    dispatch,
    getState: () => state,
  });
  return { controller, getState: () => state };
}

describe("graphController", () => {
  it("expand merges the fetched page into state", async () => {
    const p = page(
      [entity("release:a")],
      [{ id: "rel:1", source: "release:a", target: "label:x", type: "released_on" }],
      "12",
      20
    );
    const { service } = makeService({
      getConnections: () => Promise.resolve(p),
    });
    const { controller, getState } = harness(service);
    await controller.expand("label:x");
    expect(getState().nodes["release:a"]).toBeDefined();
    expect(getState().expansions["label:x"]).toMatchObject({
      loaded: 1,
      total: 20,
      nextCursor: "12",
      status: "idle",
    });
  });

  it("a second expand while the first is pending does not call the service twice", async () => {
    const d = deferred<ConnectionsPage>();
    const { service, getConnections } = makeService({
      getConnections: () => d.promise,
    });
    const { controller } = harness(service);
    const p1 = controller.expand("a");
    const p2 = controller.expand("a");
    d.resolve(page([], []));
    await Promise.all([p1, p2]);
    expect(getConnections).toHaveBeenCalledTimes(1);
  });

  it("drops a response that arrives after reset", async () => {
    const d = deferred<ConnectionsPage>();
    const { service } = makeService({ getConnections: () => d.promise });
    const { controller, getState } = harness(service);
    const p = controller.expand("a");
    controller.reset();
    d.resolve(page([entity("b")], []));
    await p;
    expect(getState().nodes["b"]).toBeUndefined();
    expect(getState().expansions["a"]).toBeUndefined();
  });

  it("drops a response that arrives after clear", async () => {
    const d = deferred<ConnectionsPage>();
    const { service } = makeService({ getConnections: () => d.promise });
    const { controller, getState } = harness(service);
    const p = controller.expand("a");
    controller.clear();
    d.resolve(page([entity("b")], []));
    await p;
    expect(getState()).toEqual(initialGraphState);
  });

  it("drops a response that arrives after startFrom for another id", async () => {
    const d = deferred<ConnectionsPage>();
    const { service } = makeService({
      getEntity: (id) => Promise.resolve(entity(id)),
      getConnections: (id) =>
        id === "a" ? d.promise : Promise.resolve(page([], [])),
    });
    const { controller, getState } = harness(service);
    const p = controller.expand("a");
    await controller.startFrom("other");
    d.resolve(page([entity("b")], []));
    await p;
    expect(getState().nodes["b"]).toBeUndefined();
    expect(getState().rootId).toBe("other");
  });

  it("a rejection sets status error and a later expand retries", async () => {
    let calls = 0;
    const { service } = makeService({
      getConnections: () =>
        calls++ === 0
          ? Promise.reject(new Error("boom"))
          : Promise.resolve(page([], [])),
    });
    const { controller, getState } = harness(service);
    await controller.expand("a");
    expect(getState().expansions["a"].status).toBe("error");
    await controller.expand("a");
    expect(getState().expansions["a"].status).toBe("done");
  });

  it("startFrom returns false and leaves state untouched when the entity is missing", async () => {
    const { service } = makeService({ getEntity: () => Promise.resolve(undefined) });
    const { controller, getState } = harness(service);
    expect(await controller.startFrom("nope")).toBe(false);
    expect(getState()).toEqual(initialGraphState);
  });

  it("loadMore passes the cursor and appends", async () => {
    const { service, getConnections } = makeService({
      getConnections: (_id, q) =>
        q?.cursor
          ? Promise.resolve(
              page(
                [entity("c")],
                [{ id: "rel:2", source: "a", target: "c", type: "released_on" }],
                null,
                2
              )
            )
          : Promise.resolve(
              page(
                [entity("b")],
                [{ id: "rel:1", source: "a", target: "b", type: "released_on" }],
                "1",
                2
              )
            ),
    });
    const { controller, getState } = harness(service);
    await controller.expand("a");
    await controller.loadMore("a");
    expect(getConnections).toHaveBeenLastCalledWith(
      "a",
      expect.objectContaining({ cursor: "1" })
    );
    expect(getState().nodes["c"]).toBeDefined();
    expect(getState().expansions["a"]).toMatchObject({
      loaded: 2,
      status: "done",
    });
  });

  it("a disposed controller drops a late response after its service is swapped", async () => {
    const d = deferred<ConnectionsPage>();
    const first = makeService({ getConnections: () => d.promise });
    const h1 = harness(first.service);
    const p = h1.controller.expand("a");

    const second = makeService();
    const h2 = harness(second.service);
    h1.controller.dispose();

    d.resolve(page([entity("b")], []));
    await p;
    expect(h1.getState().nodes["b"]).toBeUndefined();
    await h2.controller.expand("a");
    expect(h2.getState().expansions["a"]).toBeDefined();
  });
});
