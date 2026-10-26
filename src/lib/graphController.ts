// Framework-free async controller for graph state. Owns service calls,
// stale-response invalidation, in-flight guards, and failure dispatch.
import { DEFAULT_PAGE_SIZE, type GraphService } from "./graphService";
import type { GraphAction, GraphState } from "./graphState";

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
  selectNode(id: string): void;
  select(id: string | null): void;
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
    if (getState().expansions[id]?.status === "loading") return;
    const t = token;
    dispatch({ type: "EXPAND_START", id });
    try {
      const page = await service.getConnections(id, { limit: pageSize });
      if (t !== token) return;
      dispatch({ type: "EXPAND", id, page });
    } catch {
      if (t === token) dispatch({ type: "EXPAND_FAIL", id });
    }
  }

  async function loadMore(id: string) {
    const expansion = getState().expansions[id];
    if (!expansion?.nextCursor || expansion.status === "loading") return;
    const t = token;
    dispatch({ type: "EXPAND_START", id });
    try {
      const page = await service.getConnections(id, {
        cursor: expansion.nextCursor,
        limit: pageSize,
      });
      if (t !== token) return;
      dispatch({ type: "LOAD_MORE", id, page });
    } catch {
      if (t === token) dispatch({ type: "EXPAND_FAIL", id });
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

  return {
    expand,
    loadMore,
    startFrom,

    selectNode(id) {
      dispatch({ type: "SELECT", id });
      if (!getState().expansions[id]) void expand(id);
    },

    select(id) {
      dispatch({ type: "SELECT", id });
    },

    reset() {
      dispatch({ type: "RESET" });
    },

    clear() {
      dispatch({ type: "CLEAR" });
    },

    dispose() {
      invalidate();
    },
  };
}
