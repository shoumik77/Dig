export type EntityType =
  | "label"
  | "artist"
  | "release-group"
  | "release"
  | "recording";

export type RelationshipType =
  | "released_on"
  | "performed_by"
  | "produced_by"
  | "remixed_by"
  | "credited_to"
  | "version_of"
  | "appears_on";

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

export interface ReleaseGroupMetadata {
  primaryType?: string;
  secondaryTypes?: string[];
  firstReleaseDate?: string;
  artistCredit?: string;
  disambiguation?: string;
}

export interface RecordingMetadata {
  lengthMs?: number;
  isrcs?: string[];
  artistCredit?: string;
  disambiguation?: string;
  video?: boolean;
}

export interface ReleaseTrack {
  position: number;
  number?: string;
  title: string;
  lengthMs?: number;
  /** mb:recording:{uuid} */
  recordingId: string;
  /** medium position, only present when the release has more than one medium */
  medium?: number;
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
  /** ordered by medium position then track position */
  tracks?: ReleaseTrack[];
}

export type EntityMetadata =
  | LabelMetadata
  | ArtistMetadata
  | ReleaseGroupMetadata
  | ReleaseMetadata
  | RecordingMetadata;

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
