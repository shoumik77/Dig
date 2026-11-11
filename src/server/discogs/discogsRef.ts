// Pure Discogs-URL parsing shared by the MusicBrainz normalizer (url-rels)
// and the Discogs service. No I/O.
import type { DiscogsKind } from "@/types/music";

const DISCOGS_URL_RE =
  /^https?:\/\/(?:www\.)?discogs\.com\/(release|master|artist|label)\/(\d+)(?:[-/?#].*)?$/i;

export function parseDiscogsUrl(
  url: string
): { kind: DiscogsKind; id: number } | null {
  const m = DISCOGS_URL_RE.exec(url.trim());
  if (!m) return null;
  const id = Number(m[2]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return { kind: m[1].toLowerCase() as DiscogsKind, id };
}
