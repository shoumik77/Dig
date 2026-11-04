export type EntityType = "label" | "artist" | "release";

export type RelationshipType =
  | "released_on"
  | "performed_by"
  | "produced_by"
  | "remixed_by"
  | "credited_to";

export type Provenance = "demo" | "verified";

export interface LabelMetadata {
  founded?: number;
  location?: string;
  genres?: string[];
  aliases?: string[];
  country?: string;
  foundedDate?: string;
  disambiguation?: string;
}

export interface ArtistMetadata {
  realName?: string;
  location?: string;
  aliases?: string[];
  country?: string;
  artistType?: string;
  disambiguation?: string;
}

export interface ReleaseMetadata {
  year?: number;
  catalogNumber?: string;
  format?: string;
  aliases?: string[];
  date?: string;
  country?: string;
  status?: string;
  artistCredit?: string;
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
  source?: {
    provider: "musicbrainz";
    id: string;
    url: string;
  };
}

export interface MusicRelationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
}
