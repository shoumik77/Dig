import { mockMusic, type MockDataset } from "@/data/mockMusic";
import type { ConnectionsPage, ConnectionsQuery, SearchResults } from "@/types/graph";
import type { MusicEntity, MusicRelationship } from "@/types/music";
import { searchEntities } from "./search";

export const DEFAULT_PAGE_SIZE = 12;

export interface GraphService {
  getEntity(id: string): Promise<MusicEntity | undefined>;
  getConnections(id: string, q?: ConnectionsQuery): Promise<ConnectionsPage>;
  searchEntities(query: string): Promise<SearchResults>;
  getDefaultRootId(): Promise<string>;
}

interface Connection {
  entity: MusicEntity;
  relationship: MusicRelationship;
}

function emptyPage(): ConnectionsPage {
  return { entities: [], relationships: [], nextCursor: null, total: 0 };
}

export function createMockGraphService(data: MockDataset): GraphService {
  const entitiesById = new Map(data.entities.map((e) => [e.id, e]));

  function connectionsFor(id: string): Connection[] {
    const connections: Connection[] = [];
    for (const rel of data.relationships) {
      const otherId =
        rel.source === id ? rel.target : rel.target === id ? rel.source : null;
      if (!otherId) continue;
      const entity = entitiesById.get(otherId);
      if (entity) connections.push({ entity, relationship: rel });
    }
    connections.sort(
      (a, b) =>
        a.relationship.type.localeCompare(b.relationship.type) ||
        a.entity.name.localeCompare(b.entity.name) ||
        a.entity.id.localeCompare(b.entity.id)
    );
    return connections;
  }

  return {
    getEntity(id) {
      return Promise.resolve(entitiesById.get(id));
    },

    getConnections(id, q = {}) {
      if (!entitiesById.has(id)) return Promise.resolve(emptyPage());

      const all = connectionsFor(id);
      const offset = Math.max(0, Number.parseInt(q.cursor ?? "0", 10) || 0);
      const limit = Math.max(1, q.limit ?? DEFAULT_PAGE_SIZE);
      const slice = all.slice(offset, offset + limit);
      const nextOffset = offset + slice.length;

      return Promise.resolve({
        entities: slice.map((c) => c.entity),
        relationships: slice.map((c) => c.relationship),
        nextCursor: nextOffset < all.length ? String(nextOffset) : null,
        total: all.length,
      });
    },

    searchEntities(query) {
      return Promise.resolve(searchEntities(data, query));
    },

    getDefaultRootId() {
      return Promise.resolve("label:strictly-rhythm");
    },
  };
}

export const graphService = createMockGraphService(mockMusic);
