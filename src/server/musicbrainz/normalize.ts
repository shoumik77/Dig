// Pure normalization from raw MusicBrainz JSON to app types. No I/O.
import { formatMbId, isValidMbid, mbUrl, parseMbId } from "@/lib/mbIds";
import type { ConnectionsPage, SearchResults } from "@/types/graph";
import type {
  ArtistMetadata,
  EntityType,
  LabelMetadata,
  MusicEntity,
  MusicRelationship,
  RecordingMetadata,
  ReleaseGroupMetadata,
  ReleaseMetadata,
  ReleaseTrack,
} from "@/types/music";
import { parseDiscogsUrl } from "../discogs/discogsRef";
import type {
  MBArtist,
  MBArtistCredit,
  MBLabel,
  MBRecording,
  MBRecordingRef,
  MBRelation,
  MBRelease,
  MBReleaseBrowseResponse,
  MBReleaseGroup,
  MBReleaseGroupBrowseResponse,
  MBReleaseGroupRef,
} from "./types";
import type { DiscogsRef } from "@/types/music";

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

/** First Discogs url-rel on an MB entity, if any. */
export function discogsRefOf(raw: {
  relations?: MBRelation[];
}): DiscogsRef | undefined {
  for (const rel of raw.relations ?? []) {
    if (rel.type !== "discogs" || rel["target-type"] !== "url") continue;
    const resource = rel.url?.resource;
    if (!resource) continue;
    const parsed = parseDiscogsUrl(resource);
    if (parsed) {
      return { kind: parsed.kind, id: parsed.id, url: resource };
    }
  }
  return undefined;
}

function refsOf(raw: { relations?: MBRelation[] }) {
  const discogs = discogsRefOf(raw);
  return discogs ? { refs: { discogs } } : {};
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
    ...refsOf(raw),
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
    ...refsOf(raw),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

function creditPhrase(credits?: MBArtistCredit[]): string | undefined {
  const s = (credits ?? [])
    .map((c) => `${c.name}${c.joinphrase ?? ""}`)
    .join("");
  return s || undefined;
}

export function normalizeReleaseGroup(
  raw: MBReleaseGroup | MBReleaseGroupRef
): MusicEntity {
  const metadata = compact<ReleaseGroupMetadata>({
    primaryType: raw["primary-type"] ?? undefined,
    secondaryTypes: dedupe(raw["secondary-types"] ?? []),
    firstReleaseDate: raw["first-release-date"] || undefined,
    artistCredit: creditPhrase(raw["artist-credit"]),
    disambiguation: raw.disambiguation || undefined,
  });
  return {
    id: formatMbId("release-group", raw.id),
    name: raw.title,
    type: "release-group",
    provenance: "verified",
    source: sourceOf("release-group", raw.id),
    ...refsOf(raw),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

export function normalizeRecording(
  raw: MBRecording | MBRecordingRef
): MusicEntity {
  const metadata = compact<RecordingMetadata>({
    lengthMs: raw.length ?? undefined,
    isrcs: dedupe(raw.isrcs ?? []),
    artistCredit: creditPhrase(raw["artist-credit"]),
    disambiguation: raw.disambiguation || undefined,
    video: raw.video === true ? true : undefined,
  });
  return {
    id: formatMbId("recording", raw.id),
    name: raw.title,
    type: "recording",
    provenance: "verified",
    source: sourceOf("recording", raw.id),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

function releaseTracks(raw: MBRelease): ReleaseTrack[] | undefined {
  const media = raw.media ?? [];
  const multi = media.length > 1;
  const tracks: ReleaseTrack[] = [];
  for (const m of [...media].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0)
  )) {
    for (const t of [...(m.tracks ?? [])].sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    )) {
      const recId = t.recording?.id;
      if (!recId || !isValidMbid(recId)) continue;
      tracks.push(
        compact<ReleaseTrack>({
          position: t.position ?? tracks.length + 1,
          number: t.number || undefined,
          title: t.title,
          lengthMs: t.length ?? t.recording?.length ?? undefined,
          recordingId: formatMbId("recording", recId),
          medium: multi ? (m.position ?? undefined) : undefined,
        })
      );
    }
  }
  return tracks.length ? tracks : undefined;
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
    tracks: releaseTracks(raw),
  });
  return {
    id: formatMbId("release", raw.id),
    name: raw.title,
    type: "release",
    provenance: "verified",
    source: sourceOf("release", raw.id),
    ...refsOf(raw),
    ...(Object.keys(metadata).length ? { metadata } : {}),
  };
}

export function releaseConnections(raw: MBRelease): ConnectionsPage {
  const releaseId = formatMbId("release", raw.id);
  const entities = new Map<string, MusicEntity>();
  // richer self-entity (tracks, release-group ref) merges into the node
  entities.set(releaseId, normalizeRelease(raw));
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

  const group = raw["release-group"];
  if (group?.id && isValidMbid(group.id)) {
    const groupId = formatMbId("release-group", group.id);
    entities.set(groupId, normalizeReleaseGroup(group));
    const rel: MusicRelationship = {
      id: edgeId(releaseId, groupId, "version_of"),
      source: releaseId,
      target: groupId,
      type: "version_of",
    };
    relationships.set(rel.id, rel);
  }

  // distinct recordings across all media (a recording may repeat)
  const seenRecordings = new Set<string>();
  for (const m of raw.media ?? []) {
    for (const t of m.tracks ?? []) {
      const rec = t.recording;
      if (!rec?.id || !isValidMbid(rec.id)) continue;
      const recId = formatMbId("recording", rec.id);
      if (seenRecordings.has(recId)) continue;
      seenRecordings.add(recId);
      entities.set(recId, normalizeRecording(rec));
      const rel: MusicRelationship = {
        id: edgeId(recId, releaseId, "appears_on"),
        source: recId,
        target: releaseId,
        type: "appears_on",
      };
      relationships.set(rel.id, rel);
    }
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

export function releaseGroupsPage(
  parentArtistId: string,
  raw: MBReleaseGroupBrowseResponse,
  offset: number
): ConnectionsPage {
  const parentMbid = parseMbId(parentArtistId)?.mbid ?? parentArtistId;
  const entities = new Map<string, MusicEntity>();
  const relationships = new Map<string, MusicRelationship>();

  for (const group of raw["release-groups"] ?? []) {
    const entity = normalizeReleaseGroup(group);
    entities.set(entity.id, entity);
    const rel: MusicRelationship = {
      id: edgeId(entity.id, parentArtistId, "credited_to"),
      source: entity.id,
      target: parentArtistId,
      type: "credited_to",
    };
    relationships.set(rel.id, rel);
  }

  const total = raw["release-group-count"] ?? 0;
  const next = offset + (raw["release-groups"]?.length ?? 0);
  return {
    entities: [...entities.values()],
    relationships: [...relationships.values()],
    nextCursor:
      (raw["release-groups"]?.length ?? 0) > 0 && next < total
        ? encodeCursor(parentMbid, next)
        : null,
    total,
  };
}

export function releasesByGroupPage(
  parentGroupId: string,
  raw: MBReleaseBrowseResponse,
  offset: number
): ConnectionsPage {
  const parentMbid = parseMbId(parentGroupId)?.mbid ?? parentGroupId;
  const entities = new Map<string, MusicEntity>();
  const relationships = new Map<string, MusicRelationship>();

  for (const release of raw.releases ?? []) {
    const entity = normalizeRelease(release);
    entities.set(entity.id, entity);
    const rel: MusicRelationship = {
      id: edgeId(entity.id, parentGroupId, "version_of"),
      source: entity.id,
      target: parentGroupId,
      type: "version_of",
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

export function recordingConnections(raw: MBRecording): ConnectionsPage {
  const recordingId = formatMbId("recording", raw.id);
  const entities = new Map<string, MusicEntity>();
  const relationships = new Map<string, MusicRelationship>();

  for (const credit of raw["artist-credit"] ?? []) {
    const artist = credit.artist;
    if (!artist?.id || !isValidMbid(artist.id)) continue;
    const artistId = formatMbId("artist", artist.id);
    entities.set(artistId, normalizeArtist(artist));
    const rel: MusicRelationship = {
      id: edgeId(recordingId, artistId, "credited_to"),
      source: recordingId,
      target: artistId,
      type: "credited_to",
    };
    relationships.set(rel.id, rel);
  }

  // MusicBrainz caps the embedded releases list at 25 entries.
  for (const release of raw.releases ?? []) {
    if (!release?.id || !isValidMbid(release.id)) continue;
    const releaseId = formatMbId("release", release.id);
    entities.set(releaseId, normalizeRelease(release));
    const rel: MusicRelationship = {
      id: edgeId(recordingId, releaseId, "appears_on"),
      source: recordingId,
      target: releaseId,
      type: "appears_on",
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


export function normalizeSearch(
  type: EntityType,
  raw: {
    labels?: MBLabel[];
    artists?: MBArtist[];
    "release-groups"?: MBReleaseGroup[];
    releases?: MBRelease[];
    recordings?: MBRecording[];
  }
): SearchResults {
  const results: SearchResults = {
    label: [],
    artist: [],
    "release-group": [],
    release: [],
    recording: [],
  };
  if (type === "label") {
    results.label = (raw.labels ?? []).map(normalizeLabel);
  } else if (type === "artist") {
    results.artist = (raw.artists ?? []).map(normalizeArtist);
  } else if (type === "release-group") {
    results["release-group"] = (raw["release-groups"] ?? []).map(
      normalizeReleaseGroup
    );
  } else if (type === "recording") {
    results.recording = (raw.recordings ?? []).map(normalizeRecording);
  } else {
    results.release = (raw.releases ?? []).map(normalizeRelease);
  }
  return results;
}
