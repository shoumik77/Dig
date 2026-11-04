import type { EntityType, MusicEntity, MusicRelationship } from "./music";

export interface ConnectionsPage {
  entities: MusicEntity[];
  relationships: MusicRelationship[];
  nextCursor: string | null;
  total: number;
}

export interface ConnectionsQuery {
  cursor?: string | null;
  limit?: number;
}

export interface SearchQuery {
  type?: EntityType;
}

export interface SearchResults {
  labels: MusicEntity[];
  artists: MusicEntity[];
  releases: MusicEntity[];
}
