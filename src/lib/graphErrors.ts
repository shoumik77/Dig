export type GraphErrorKind =
  | "network"
  | "timeout"
  | "rate_limited"
  | "upstream"
  | "not_found"
  | "invalid";

const RETRYABLE: ReadonlySet<GraphErrorKind> = new Set([
  "network",
  "timeout",
  "rate_limited",
  "upstream",
]);

export class GraphServiceError extends Error {
  readonly kind: GraphErrorKind;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(
    kind: GraphErrorKind,
    message: string,
    opts?: { retryAfterMs?: number; cause?: unknown }
  ) {
    super(message, { cause: opts?.cause });
    this.name = "GraphServiceError";
    this.kind = kind;
    this.retryable = RETRYABLE.has(kind);
    this.retryAfterMs = opts?.retryAfterMs;
  }
}
