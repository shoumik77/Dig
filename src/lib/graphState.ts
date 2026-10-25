// Pure paginated graph state — no I/O, no service imports.
import type { ConnectionsPage } from "@/types/graph";
import type { MusicEntity, MusicRelationship } from "@/types/music";

export interface NodeExpansion {
  loaded: number;
  total: number;
  nextCursor: string | null;
  status: "idle" | "loading" | "done";
}

export interface GraphState {
  rootId: string | null;
  nodes: Record<string, MusicEntity>;
  edges: Record<string, MusicRelationship>;
  expansions: Record<string, NodeExpansion>;
  selectedId: string | null;
  parentOf: Record<string, string>;
}

export type GraphAction =
  | { type: "INIT_FROM"; entity: MusicEntity }
  | { type: "SELECT"; id: string | null }
  | { type: "EXPAND_START"; id: string }
  | { type: "EXPAND"; id: string; page: ConnectionsPage }
  | { type: "LOAD_MORE"; id: string; page: ConnectionsPage }
  | { type: "RESET" };

export const initialGraphState: GraphState = {
  rootId: null,
  nodes: {},
  edges: {},
  expansions: {},
  selectedId: null,
  parentOf: {},
};

function mergePage(
  state: GraphState,
  id: string,
  page: ConnectionsPage,
  append: boolean
): GraphState {
  const nodes = { ...state.nodes };
  const edges = { ...state.edges };
  const parentOf = { ...state.parentOf };

  for (const entity of page.entities) {
    if (!(entity.id in nodes)) {
      parentOf[entity.id] = id;
    }
    nodes[entity.id] = entity;
  }
  for (const rel of page.relationships) {
    edges[rel.id] = rel;
  }

  const prev = state.expansions[id] ?? {
    loaded: 0,
    total: 0,
    nextCursor: null,
    status: "idle" as const,
  };
  const expansions = {
    ...state.expansions,
    [id]: {
      loaded: Math.min(
        (append ? prev.loaded : 0) + page.relationships.length,
        page.total
      ),
      total: page.total,
      nextCursor: page.nextCursor,
      status: page.nextCursor ? "idle" : "done",
    } satisfies NodeExpansion,
  };

  return { ...state, nodes, edges, expansions, parentOf };
}

export function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case "INIT_FROM": {
      const { entity } = action;
      return {
        rootId: entity.id,
        nodes: { [entity.id]: entity },
        edges: {},
        expansions: {},
        selectedId: entity.id,
        parentOf: {},
      };
    }

    case "SELECT":
      return { ...state, selectedId: action.id };

    case "EXPAND_START": {
      const prev = state.expansions[action.id] ?? {
        loaded: 0,
        total: 0,
        nextCursor: null,
        status: "idle" as const,
      };
      return {
        ...state,
        expansions: {
          ...state.expansions,
          [action.id]: { ...prev, status: "loading" },
        },
      };
    }

    case "EXPAND":
      return mergePage(state, action.id, action.page, false);
    case "LOAD_MORE":
      return mergePage(state, action.id, action.page, true);

    case "RESET": {
      if (!state.rootId) return initialGraphState;
      const root = state.nodes[state.rootId];
      if (!root) return initialGraphState;
      return {
        rootId: state.rootId,
        nodes: { [state.rootId]: root },
        edges: {},
        expansions: {},
        selectedId: state.rootId,
        parentOf: {},
      };
    }

    default:
      return state;
  }
}

// ── Selectors ───────────────────────────────────────────────────────────

export function getExpansion(state: GraphState, id: string): NodeExpansion | undefined {
  return state.expansions[id];
}

export function hasMore(state: GraphState, id: string): boolean {
  return state.expansions[id]?.nextCursor != null;
}

export function isExpanded(state: GraphState, id: string): boolean {
  return id in state.expansions;
}

export function neighborsOf(state: GraphState, id: string): MusicEntity[] {
  const seen = new Set<string>();
  const out: MusicEntity[] = [];
  for (const rel of Object.values(state.edges)) {
    const other =
      rel.source === id ? rel.target : rel.target === id ? rel.source : null;
    if (other && !seen.has(other)) {
      const entity = state.nodes[other];
      if (entity) {
        seen.add(other);
        out.push(entity);
      }
    }
  }
  return out;
}
