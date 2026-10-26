// Pure normalization from raw MusicBrainz JSON to app types. No I/O.
import { formatMbId, isValidMbid, mbUrl, parseMbId } from "@/lib/mbIds";
import type { ConnectionsPage, SearchResults } from "@/types/graph";
import type {
  ArtistMetadata,
  EntityType,
  LabelMetadata,
  MusicEntity,
  MusicRelationship,
  ReleaseMetadata,
} from "@/types/music";
import type {
  MBArtist,
  MBLabel,
  MBRelease,
  MBReleaseBrowseResponse,
} from "./types";

export function edgeId(
  source: string,
  target: string,
  type: MusicRelationship["type"]
): string {
  return `rel:${source}->${target}-${type}`;
}

export function encodeCursor(mbid: string, offset: number): string {
  return `${mbid}:${offset}`;
}

export function decodeCursor(
  cursor: string,
  expectedMbid: string
): number | null {
  const sep = cursor.lastIndexOf(":");
  if (sep < 0) return null;
  const mbid = cursor.slice(0, sep);
  const offsetRaw = cursor.slice(sep + 1);
  if (mbid !== expectedMbid) return null;
  if (!/^\d+$/.test(offsetRaw)) return null;
  const offset = Number(offsetRaw);
  if (!Number.isSafeInteger(offset) || offset > 1_000_000) return null;
  return offset;
}

function dedupe(values: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    const t = v.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function compact<T extends object>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out) as (keyof T)[]) {
    const v = out[k];
    if (v === undefined || v === null || v === "") delete out[k];
    if (Array.isArray(v) && v.length === 0) delete out[k];
  }
  return out;
}

function sourceOf(type: EntityType, mbid: string) {
  return { provider: "musicbrainz" as const, id: mbid, url: mbUrl(type, mbid) };
}

function aliasNames(raw?: { name?: string }[]): string[] | undefined {
  const names = dedupe((raw ?? []).map((a) => a.name));
  return names.length ? names : undefined;
}

export function normalizeLabel(raw: MBLabel): MusicEntity {
  const metadata = compact<LabelMetadata>({
    country: raw.country ?? undefined,
    foundedDate: raw["life-span"]?.begin ?? undefined,
    disambiguation: raw.disambiguation || undefined,
    aliases: aliasNames(raw.aliases),
  });
  return {
    id: formatMbId("label", raw.id),
    name: raw.name,
    type: "label",
    provenance: "verified",
    source: sourceOf("label", raw.id),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

export function normalizeArtist(raw: MBArtist): MusicEntity {
  const metadata = compact<ArtistMetadata>({
    country: raw.country ?? undefined,
    artistType: raw.type ?? undefined,
    disambiguation: raw.disambiguation || undefined,
    aliases: aliasNames(raw.aliases),
  });
  return {
    id: formatMbId("artist", raw.id),
    name: raw.name,
    type: "artist",
    provenance: "verified",
    source: sourceOf("artist", raw.id),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

export function normalizeRelease(raw: MBRelease): MusicEntity {
  const formats = dedupe((raw.media ?? []).map((m) => m.format));
  const catalogNumber = (raw["label-info"] ?? [])
    .map((li) => li["catalog-number"])
    .find((cn) => typeof cn === "string" && cn.trim() !== "");
  const artistCredit = (raw["artist-credit"] ?? [])
    .map((c) => `${c.name}${c.joinphrase ?? ""}`)
    .join("");
  const metadata = compact<ReleaseMetadata>({
    date: raw.date ?? undefined,
    country: raw.country ?? undefined,
    status: raw.status ?? undefined,
    catalogNumber: catalogNumber ?? undefined,
    format: formats.length ? formats.join(", ") : undefined,
    artistCredit: artistCredit || undefined,
  });
  return {
    id: formatMbId("release", raw.id),
    name: raw.title,
    type: "release",
    provenance: "verified",
    source: sourceOf("release", raw.id),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

export function releaseConnections(raw: MBRelease): ConnectionsPage {
  const releaseId = formatMbId("release", raw.id);
  const entities = new Map<string, MusicEntity>();
  const relationships = new Map<string, MusicRelationship>();

  for (const credit of raw["artist-credit"] ?? []) {
    const artist = credit.artist;
    if (!artist?.id || !isValidMbid(artist.id)) continue;
    const artistId = formatMbId("artist", artist.id);
    entities.set(artistId, normalizeArtist(artist));
    const rel: MusicRelationship = {
      id: edgeId(releaseId, artistId, "credited_to"),
      source: releaseId,
      target: artistId,
      type: "credited_to",
    };
    relationships.set(rel.id, rel);
  }

  for (const info of raw["label-info"] ?? []) {
    const label = info.label;
    if (!label?.id || !isValidMbid(label.id)) continue;
    const labelId = formatMbId("label", label.id);
    entities.set(labelId, normalizeLabel(label));
    const rel: MusicRelationship = {
      id: edgeId(releaseId, labelId, "released_on"),
      source: releaseId,
      target: labelId,
      type: "released_on",
    };
    relationships.set(rel.id, rel);
  }

  return {
    entities: [...entities.values()],
    relationships: [...relationships.values()],
    nextCursor: null,
    total: relationships.size,
  };
}

export function releasesPage(
  parent: { id: string; type: "label" | "artist" },
  raw: MBReleaseBrowseResponse,
  offset: number
): ConnectionsPage {
  const parentMbid = parseMbId(parent.id)?.mbid ?? parent.id;
  const entities = new Map<string, MusicEntity>();
  const relationships = new Map<string, MusicRelationship>();
  const edgeType = parent.type === "label" ? "released_on" : "credited_to";

  for (const release of raw.releases ?? []) {
    const entity = normalizeRelease(release);
    entities.set(entity.id, entity);
    const rel: MusicRelationship = {
      id: edgeId(entity.id, parent.id, edgeType),
      source: entity.id,
      target: parent.id,
      type: edgeType,
    };
    relationships.set(rel.id, rel);
  }

  const total = raw["release-count"] ?? 0;
  const next = offset + (raw.releases?.length ?? 0);
  return {
    entities: [...entities.values()],
    relationships: [...relationships.values()],
    nextCursor:
      (raw.releases?.length ?? 0) > 0 && next < total
        ? encodeCursor(parentMbid, next)
        : null,
    total,
  };
}


export function normalizeSearch(
  type: EntityType,
  raw: {
    labels?: MBLabel[];
    artists?: MBArtist[];
    releases?: MBRelease[];
  }
): SearchResults {
  const results: SearchResults = { labels: [], artists: [], releases: [] };
  if (type === "label") {
    results.labels = (raw.labels ?? []).map(normalizeLabel);
  } else if (type === "artist") {
    results.artists = (raw.artists ?? []).map(normalizeArtist);
  } else {
    results.releases = (raw.releases ?? []).map(normalizeRelease);
  }
  return results;
}
