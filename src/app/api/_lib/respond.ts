import { GraphServiceError, type GraphErrorKind } from "@/lib/graphErrors";

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

export const STATUS_BY_KIND: Record<GraphErrorKind, number> = {
  invalid: 400,
  not_found: 404,
  rate_limited: 429,
  upstream: 502,
  network: 502,
  timeout: 504,
};

// `messages` must be fixed strings — internal error strings may embed
// upstream URLs or other internals that must not reach the client.
export function fromError(
  err: unknown,
  messages: Record<GraphErrorKind, string>
): Response {
  if (err instanceof GraphServiceError) {
    const kind = STATUS_BY_KIND[err.kind] ? err.kind : "upstream";
    return fail(STATUS_BY_KIND[kind], kind, messages[kind], err.retryAfterMs);
  }
  return fail(500, "upstream", "Upstream request failed");
}
