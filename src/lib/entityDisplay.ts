// Presentational helpers shared by the details panel, search results and
// crate screens — pure, no I/O.
import { ENTITY_LABELS } from "@/components/graph/graphStyles";
import type {
  ArtistMetadata,
  LabelMetadata,
  MusicEntity,
  RecordingMetadata,
  ReleaseGroupMetadata,
  ReleaseMetadata,
  RelationshipType,
} from "@/types/music";

export function formatLength(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Best-available artwork URL for an entity (Discogs enrich-on-select). */
export function artworkUrl(entity: MusicEntity): string | undefined {
  const d = entity.enrichment?.discogs;
  return d?.imageUrl ?? d?.thumbUrl;
}

/** Up to two uppercase initials for a fallback tile. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** "Label · New York, US · Est. 1989" / "Release · Hardrive · 1993" … */
export function entityMetaLine(entity: MusicEntity): string {
  const meta = (entity.metadata ?? {}) as Record<string, unknown>;
  const parts: string[] = [ENTITY_LABELS[entity.type]];
  const location =
    (meta.location as string | undefined) ?? (meta.country as string | undefined);
  if (location) parts.push(location);
  switch (entity.type) {
    case "label": {
      const m = entity.metadata as LabelMetadata | undefined;
      const founded = m?.founded ?? m?.foundedDate;
      if (founded) parts.push(`Est. ${founded}`);
      else if (m?.genres?.length) parts.push(m.genres.slice(0, 2).join(", "));
      break;
    }
    case "artist": {
      const m = entity.metadata as ArtistMetadata | undefined;
      if (m?.genres?.length) parts.push(m.genres.slice(0, 2).join(", "));
      else if (m?.artistType) parts.push(m.artistType);
      break;
    }
    case "release":
    case "release-group": {
      const m = entity.metadata as
        | ReleaseMetadata
        | ReleaseGroupMetadata
        | undefined;
      const credit = m?.artistCredit;
      const year =
        (m as ReleaseMetadata | undefined)?.year ??
        (m as ReleaseGroupMetadata | undefined)?.firstReleaseDate?.slice(0, 4);
      if (credit) parts.push(credit);
      if (year) parts.push(String(year));
      break;
    }
    case "recording": {
      const m = entity.metadata as RecordingMetadata | undefined;
      if (m?.artistCredit) parts.push(m.artistCredit);
      if (typeof m?.lengthMs === "number") parts.push(formatLength(m.lengthMs));
      break;
    }
  }
  return parts.join(" · ");
}

/** Short edge caption used on graph connectors. */
export function edgeLabel(type: RelationshipType): string {
  switch (type) {
    case "released_on":
      return "released on";
    case "performed_by":
      return "performed by";
    case "produced_by":
      return "produced by";
    case "remixed_by":
      return "remixed by";
    case "credited_to":
      return "credited to";
    case "version_of":
      return "version of";
    case "appears_on":
      return "appears on";
  }
}

/** "4 days ago" style timestamps for crate rows. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const CRATE_TAGLINES = [
  "Deep cuts for the late shift.",
  "A slow entrance. A long way home.",
  "The labels that built the sound.",
  "Keep what moves you.",
  "For the records that find you at 3am.",
];

/** Deterministic editorial tagline for a crate (crates carry no description). */
export function crateTagline(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return CRATE_TAGLINES[hash % CRATE_TAGLINES.length];
}
