import type { EntityType } from "@/types/music";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MB_TYPES = new Set<EntityType>(["label", "artist", "release"]);

export function isValidMbid(s: string): boolean {
  return UUID_RE.test(s);
}

export function formatMbId(type: EntityType, mbid: string): string {
  return `mb:${type}:${mbid.toLowerCase()}`;
}

export function parseMbId(
  id: string
): { type: EntityType; mbid: string } | null {
  const parts = id.split(":");
  if (parts.length !== 3 || parts[0] !== "mb") return null;
  const type = parts[1] as EntityType;
  if (!MB_TYPES.has(type)) return null;
  const mbid = parts[2];
  if (!isValidMbid(mbid)) return null;
  return { type, mbid: mbid.toLowerCase() };
}

export function mbUrl(type: EntityType, mbid: string): string {
  return `https://musicbrainz.org/${type}/${mbid}`;
}
