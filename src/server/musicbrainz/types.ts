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

export interface MBRecordingRef {
  id: string;
  title: string;
  length?: number | null;
  isrcs?: string[];
  video?: boolean | null;
  disambiguation?: string;
  "first-release-date"?: string;
  "artist-credit"?: MBArtistCredit[];
}

export interface MBTrack {
  id?: string;
  position?: number;
  number?: string;
  title: string;
  length?: number | null;
  "artist-credit"?: MBArtistCredit[];
  recording?: MBRecordingRef;
}

export interface MBMedia {
  id?: string;
  title?: string;
  format?: string | null;
  "format-id"?: string | null;
  "track-count"?: number;
  "track-offset"?: number;
  position?: number;
  tracks?: MBTrack[];
}

export interface MBReleaseGroupRef {
  id: string;
  title: string;
  "primary-type"?: string | null;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  disambiguation?: string;
  "artist-credit"?: MBArtistCredit[];
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
  "release-group"?: MBReleaseGroupRef;
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

export interface MBReleaseGroup {
  id: string;
  title: string;
  "primary-type"?: string | null;
  "primary-type-id"?: string | null;
  "secondary-types"?: string[];
  "first-release-date"?: string;
  disambiguation?: string;
  "artist-credit"?: MBArtistCredit[];
  score?: number;
}

export interface MBRecording {
  id: string;
  title: string;
  length?: number | null;
  isrcs?: string[];
  video?: boolean | null;
  disambiguation?: string;
  "first-release-date"?: string;
  "artist-credit"?: MBArtistCredit[];
  releases?: MBRelease[];
  score?: number;
}

export interface MBReleaseGroupBrowseResponse {
  "release-group-count": number;
  "release-group-offset": number;
  "release-groups": MBReleaseGroup[];
}

export interface MBReleaseGroupSearchResponse {
  created?: string;
  count: number;
  offset: number;
  "release-groups": MBReleaseGroup[];
}

export interface MBRecordingSearchResponse {
  created?: string;
  count: number;
  offset: number;
  recordings: MBRecording[];
}
