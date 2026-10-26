// Raw MusicBrainz WS/2 JSON shapes (verified against live responses;
// see __fixtures__/).

export interface MBLifeSpan {
  begin?: string | null;
  end?: string | null;
  ended?: boolean;
}

export interface MBArea {
  id?: string;
  name?: string;
  "sort-name"?: string;
}

export interface MBLabelRef {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string | null;
  "type-id"?: string | null;
  "label-code"?: number | null;
  disambiguation?: string;
}

export interface MBArtistRef {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string | null;
  "type-id"?: string | null;
  disambiguation?: string;
  country?: string | null;
}

export interface MBArtistCredit {
  name: string;
  joinphrase?: string;
  artist?: MBArtistRef;
}

export interface MBLabelInfo {
  "catalog-number"?: string | null;
  label?: MBLabelRef | null;
}

export interface MBMedia {
  id?: string;
  title?: string;
  format?: string | null;
  "format-id"?: string | null;
  "track-count"?: number;
  position?: number;
}

export interface MBAlias {
  name: string;
  "sort-name"?: string;
  type?: string | null;
  locale?: string | null;
  primary?: boolean | null;
  begin?: string | null;
  end?: string | null;
  ended?: boolean;
}

export interface MBLabel {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string | null;
  "type-id"?: string | null;
  "label-code"?: number | null;
  country?: string | null;
  area?: MBArea | null;
  disambiguation?: string;
  "life-span"?: MBLifeSpan;
  aliases?: MBAlias[];
  score?: number;
}

export interface MBArtist {
  id: string;
  name: string;
  "sort-name"?: string;
  type?: string | null;
  "type-id"?: string | null;
  country?: string | null;
  gender?: string | null;
  area?: MBArea | null;
  "begin-area"?: MBArea | null;
  disambiguation?: string;
  "life-span"?: MBLifeSpan;
  aliases?: MBAlias[];
  score?: number;
}

export interface MBRelease {
  id: string;
  title: string;
  status?: string | null;
  "status-id"?: string | null;
  date?: string | null;
  country?: string | null;
  barcode?: string | null;
  asin?: string | null;
  disambiguation?: string;
  packaging?: string | null;
  quality?: string;
  "artist-credit"?: MBArtistCredit[];
  "label-info"?: MBLabelInfo[];
  media?: MBMedia[];
  "release-events"?: { date?: string; area?: MBArea | null }[];
  "text-representation"?: { language?: string | null; script?: string | null };
  score?: number;
  "track-count"?: number;
}

export interface MBLabelSearchResponse {
  created?: string;
  count: number;
  offset: number;
  labels: MBLabel[];
}

export interface MBArtistSearchResponse {
  created?: string;
  count: number;
  offset: number;
  artists: MBArtist[];
}

export interface MBReleaseSearchResponse {
  created?: string;
  count: number;
  offset: number;
  releases: MBRelease[];
}

export interface MBReleaseBrowseResponse {
  "release-count": number;
  "release-offset": number;
  releases: MBRelease[];
}
