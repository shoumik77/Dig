import type { GraphErrorKind } from "@/lib/graphErrors";
import type { EntityType } from "@/types/music";
import { ENTITY_TYPES } from "@/types/music";
import { fromError as baseFromError } from "../../_lib/respond";

export { fail, ok } from "../../_lib/respond";

// Fixed messages: internal error strings may embed upstream URLs.
const MESSAGE_BY_KIND: Record<GraphErrorKind, string> = {
  invalid: "Invalid request",
  not_found: "Not found",
  rate_limited: "MusicBrainz is rate limiting requests; try again shortly",
  upstream: "MusicBrainz is unavailable",
  network: "MusicBrainz is unavailable",
  timeout: "MusicBrainz timed out",
};

export function fromError(err: unknown): Response {
  return baseFromError(err, MESSAGE_BY_KIND);
}

export function parseEntityType(s: string | null): EntityType | null {
  return s && (ENTITY_TYPES as readonly string[]).includes(s)
    ? (s as EntityType)
    : null;
}

export function parseLimit(s: string | null): number {
  const n = s === null ? NaN : Number(s);
  if (!Number.isFinite(n)) return 12;
  return Math.min(25, Math.max(1, Math.trunc(n)));
}

export function parseQuery(s: string | null): string | null {
  const q = s?.trim() ?? "";
  return q.length >= 1 && q.length <= 200 ? q : null;
}
