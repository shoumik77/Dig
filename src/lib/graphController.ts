// Framework-free async controller for graph state. Owns service calls,
// stale-response invalidation, in-flight guards, and failure dispatch.
import { DEFAULT_PAGE_SIZE, type GraphService } from "./graphService";
import type { GraphAction, GraphState } from "./graphState";
import type { MusicEntity } from "@/types/music";

export interface GraphControllerDeps {
  service: GraphService;
  dispatch(action: GraphAction): void;
  getState(): GraphState;
  pageSize?: number;
}

export interface GraphController {
  expand(id: string): Promise<void>;
  loadMore(id: string): Promise<void>;
  startFrom(id: string): Promise<boolean>;
  startFromEntity(entity: MusicEntity): Promise<void>;
  selectNode(id: string): void;
  select(id: string | null): void;
  enrich(id: string): Promise<void>;
  reset(): void;
  clear(): void;
  dispose(): void;
}

export function createGraphController(
  deps: GraphControllerDeps
): GraphController {
  const { service, getState } = deps;
  const pageSize = deps.pageSize ?? DEFAULT_PAGE_SIZE;
  let token = 0;
  // Local in-flight guard: dispatched state may lag behind (React batching),
  // so expansions[id].status alone cannot dedupe same-tick calls.
  const inflight = new Set<string>();
  const enriching = new Set<string>();

  function invalidate() {
    token += 1;
  }

  function dispatch(action: GraphAction) {
    if (
      action.type === "INIT_FROM" ||
      action.type === "RESET" ||
      action.type === "CLEAR"
    ) {
      invalidate();
    }
    deps.dispatch(action);
  }

  async function expand(id: string) {
    if (inflight.has(id)) return;
    if (getState().expansions[id]?.status === "loading") return;
    const t = token;
    inflight.add(id);
    try {
      dispatch({ type: "EXPAND_START", id });
      const page = await service.getConnections(id, { limit: pageSize });
      if (t !== token) return;
      dispatch({ type: "EXPAND", id, page });
    } catch {
      if (t === token) dispatch({ type: "EXPAND_FAIL", id });
    } finally {
      inflight.delete(id);
    }
  }

  async function loadMore(id: string) {
    if (inflight.has(id)) return;
    const expansion = getState().expansions[id];
    if (!expansion?.nextCursor || expansion.status === "loading") return;
    const t = token;
    inflight.add(id);
    try {
      dispatch({ type: "EXPAND_START", id });
      const page = await service.getConnections(id, {
        cursor: expansion.nextCursor,
        limit: pageSize,
      });
      if (t !== token) return;
      dispatch({ type: "LOAD_MORE", id, page });
    } catch {
      if (t === token) dispatch({ type: "EXPAND_FAIL", id });
    } finally {
      inflight.delete(id);
    }
  }

  async function startFrom(id: string): Promise<boolean> {
    const t = token;
    let entity;
    try {
      entity = await service.getEntity(id);
    } catch {
      return false;
    }
    if (t !== token || !entity) return false;
    dispatch({ type: "INIT_FROM", entity });
    await expand(id);
    return true;
  }

  async function startFromEntity(entity: MusicEntity) {
    dispatch({ type: "INIT_FROM", entity });
    await expand(entity.id);
  }

  async function enrich(id: string) {
    // Enrichment is lazy and selection-driven — never on the expansion path.
    if (service.providerId !== "musicbrainz") return;
    if (getState().nodes[id]?.enrichment) return;
    if (enriching.has(id)) return;
    const t = token;
    enriching.add(id);
    try {
      const enrichment = await service.getEnrichment(id);
      if (t !== token) return;
      dispatch({ type: "ENRICH", id, enrichment, fetchedAt: Date.now() });
    } catch {
      // leave the node untouched so a later selection retries
    } finally {
      enriching.delete(id);
    }
  }

  function maybeEnrich(id: string | null) {
    if (id && service.providerId === "musicbrainz") void enrich(id);
  }

  return {
    expand,
    loadMore,
    startFrom,
    startFromEntity,
    enrich,

    selectNode(id) {
      dispatch({ type: "SELECT", id });
      maybeEnrich(id);
      const status = getState().expansions[id]?.status;
      if (status === undefined || status === "error") void expand(id);
    },

    select(id) {
      dispatch({ type: "SELECT", id });
      maybeEnrich(id);
    },

    reset() {
      inflight.clear();
      enriching.clear();
      dispatch({ type: "RESET" });
    },

    clear() {
      inflight.clear();
      enriching.clear();
      dispatch({ type: "CLEAR" });
    },

    dispose() {
      invalidate();
      inflight.clear();
      enriching.clear();
    },
  };
}
