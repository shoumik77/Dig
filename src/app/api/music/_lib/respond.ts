import { GraphServiceError, type GraphErrorKind } from "@/lib/graphErrors";
import type { EntityType } from "@/types/music";

export const ENTITY_TYPES = new Set<string>(["label", "artist", "release"]);

export function ok(data: unknown, init?: ResponseInit): Response {
  return Response.json(
    { ok: true, data },
    {
      ...init,
      headers: {
        "Cache-Control": "private, max-age=60",
        ...init?.headers,
      },
    }
  );
}

export function fail(
  status: number,
  kind: GraphErrorKind,
  message: string,
  retryAfterMs?: number
): Response {
  const headers: Record<string, string> = {};
  if (retryAfterMs !== undefined) {
    headers["Retry-After"] = String(Math.ceil(retryAfterMs / 1000));
  }
  return Response.json(
    { ok: false, error: { kind, message, retryAfterMs } },
    { status, headers }
  );
}

const STATUS_BY_KIND: Record<GraphErrorKind, number> = {
  invalid: 400,
  not_found: 404,
  rate_limited: 429,
  upstream: 502,
  network: 502,
  timeout: 504,
};

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
  if (err instanceof GraphServiceError) {
    const kind = STATUS_BY_KIND[err.kind] ? err.kind : "upstream";
    return fail(
      STATUS_BY_KIND[kind],
      kind,
      MESSAGE_BY_KIND[kind],
      err.retryAfterMs
    );
  }
  return fail(500, "upstream", "Upstream request failed");
}

export function parseEntityType(s: string | null): EntityType | null {
  return s && ENTITY_TYPES.has(s) ? (s as EntityType) : null;
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
