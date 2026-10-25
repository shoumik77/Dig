export type EntityType = "label" | "artist" | "release";

export type RelationshipType =
  | "released_on"
  | "performed_by"
  | "produced_by"
  | "remixed_by";

export type Provenance = "demo" | "verified";

export interface LabelMetadata {
  founded?: number;
  location?: string;
  genres?: string[];
  aliases?: string[];
}

export interface ArtistMetadata {
  realName?: string;
  location?: string;
  aliases?: string[];
}

export interface ReleaseMetadata {
  year?: number;
  catalogNumber?: string;
  format?: string;
  aliases?: string[];
}

export type EntityMetadata =
  | LabelMetadata
  | ArtistMetadata
  | ReleaseMetadata;

export interface MusicEntity {
  id: string;
  name: string;
  type: EntityType;
  metadata?: EntityMetadata;
  provenance: Provenance;
}

export interface MusicRelationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
}
