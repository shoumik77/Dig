// Raw Discogs API JSON shapes — only the fields we read.

export interface DGImage {
  type?: string;
  uri?: string;
  uri150?: string;
  width?: number;
  height?: number;
}

export interface DGVideo {
  uri?: string;
  title?: string;
  duration?: number;
  embed?: boolean;
}

export interface DGArtistRef {
  id?: number;
  name?: string;
  role?: string;
  tracks?: string;
}

export interface DGTrack {
  position?: string;
  title?: string;
  duration?: string;
  extraartists?: DGArtistRef[];
}

export interface DGFormat {
  name?: string;
  qty?: string;
  descriptions?: string[];
}

export interface DGCommunity {
  have?: number;
  want?: number;
}

export interface DGRelease {
  id: number;
  title?: string;
  year?: number;
  released?: string;
  country?: string;
  uri?: string;
  master_id?: number;
  genres?: string[];
  styles?: string[];
  images?: DGImage[];
  thumb?: string;
  videos?: DGVideo[];
  artists?: DGArtistRef[];
  extraartists?: DGArtistRef[];
  tracklist?: DGTrack[];
  formats?: DGFormat[];
  community?: DGCommunity;
  num_for_sale?: number;
  lowest_price?: number | null;
}

export interface DGMaster {
  id: number;
  title?: string;
  year?: number;
  uri?: string;
  main_release?: number;
  genres?: string[];
  styles?: string[];
  images?: DGImage[];
  videos?: DGVideo[];
  artists?: DGArtistRef[];
  tracklist?: DGTrack[];
  num_for_sale?: number;
  lowest_price?: number | null;
}

export interface DGArtist {
  id: number;
  name?: string;
  realname?: string;
  profile?: string;
  uri?: string;
  urls?: string[];
  images?: DGImage[];
}

export interface DGLabel {
  id: number;
  name?: string;
  profile?: string;
  contact_info?: string;
  uri?: string;
  urls?: string[];
  images?: DGImage[];
}
