import { GraphServiceError } from "@/lib/graphErrors";

export interface RequestSchedulerDeps {
  minIntervalMs: number;
  maxQueue: number;
  maxRetries: number;
  timeoutMs: number;
  headers: Record<string, string>;
  fetchImpl?: typeof fetch;
  now?: () => number;
  setTimeoutImpl?: typeof setTimeout;
}

export interface RequestScheduler {
  request(url: string): Promise<unknown>;
  readonly pending: number;
}

interface Job {
  url: string;
  resolve(value: unknown): void;
  reject(err: unknown): void;
}

const RETRY_AFTER_CAP_MS = 30_000;

function parseRetryAfter(header: string | null, now: () => number): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return Math.min(Math.max(0, seconds * 1000), RETRY_AFTER_CAP_MS);
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(0, date - now()), RETRY_AFTER_CAP_MS);
  }
  return null;
}

export function createRequestScheduler(
  deps: RequestSchedulerDeps
): RequestScheduler {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now ?? Date.now;
  const setTimeoutImpl = deps.setTimeoutImpl ?? setTimeout;
  const { minIntervalMs, maxQueue, maxRetries, timeoutMs, headers } = deps;

  const queue: Job[] = [];
  const inflight = new Map<string, Promise<unknown>>();
  let lastDispatch = Number.NEGATIVE_INFINITY;
  let pumping = false;

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeoutImpl(resolve, ms));
  }

  async function waitForSlot() {
    const wait = minIntervalMs - (now() - lastDispatch);
    if (wait > 0) await delay(wait);
    lastDispatch = now();
  }

  async function attempt(url: string): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeoutImpl(() => controller.abort(), timeoutMs);
    try {
      return await fetchImpl(url, {
        headers: { Accept: "application/json", ...headers },
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new GraphServiceError("timeout", `Request timed out: ${url}`, {
          cause: err,
        });
      }
      if (err instanceof TypeError) {
        throw new GraphServiceError("network", `Network failure: ${url}`, {
          cause: err,
        });
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async function runJob(job: Job) {
    let lastError: GraphServiceError | null = null;
    for (let i = 0; i <= maxRetries; i++) {
      if (i > 0) {
        const retryAfter =
          lastError?.retryAfterMs ?? 1000 * 2 ** (i - 1);
        await delay(Math.max(retryAfter, minIntervalMs));
      }
      await waitForSlot();
      lastError = null;
      try {
        const res = await attempt(job.url);
        if (res.ok) {
          try {
            const json: unknown = await res.json();
            job.resolve(json);
            return;
          } catch (err) {
            throw new GraphServiceError(
              "upstream",
              `Invalid JSON from upstream: ${job.url}`,
              { cause: err }
            );
          }
        }
        const { status } = res;
        if (status === 404) {
          throw new GraphServiceError("not_found", `Not found: ${job.url}`);
        }
        if (status === 429 || status === 503) {
          const retryAfterMs =
            parseRetryAfter(res.headers.get("Retry-After"), now) ?? undefined;
          lastError = new GraphServiceError(
            status === 429 ? "rate_limited" : "upstream",
            `Upstream responded ${status}: ${job.url}`,
            { retryAfterMs }
          );
          if (i === maxRetries) throw lastError;
          continue;
        }
        if (status >= 400 && status < 500) {
          throw new GraphServiceError(
            "invalid",
            `Upstream responded ${status}: ${job.url}`
          );
        }
        throw new GraphServiceError(
          "upstream",
          `Upstream responded ${status}: ${job.url}`
        );
      } catch (err) {
        if (
          err instanceof GraphServiceError &&
          (err.kind === "rate_limited" || err.kind === "upstream") &&
          err === lastError &&
          i < maxRetries
        ) {
          continue;
        }
        job.reject(err);
        return;
      }
    }
  }

  async function pump() {
    if (pumping) return;
    pumping = true;
    try {
      while (queue.length > 0) {
        const job = queue.shift()!;
        await runJob(job);
      }
    } finally {
      pumping = false;
      if (queue.length > 0) void pump();
    }
  }

  return {
    request(url: string): Promise<unknown> {
      const existing = inflight.get(url);
      if (existing) return existing;
      if (queue.length >= maxQueue) {
        return Promise.reject(
          new GraphServiceError(
            "rate_limited",
            `Request queue is full (${maxQueue})`
          )
        );
      }
      const promise = new Promise<unknown>((resolve, reject) => {
        queue.push({ url, resolve, reject });
      });
      inflight.set(url, promise);
      const cleanup = () => {
        inflight.delete(url);
      };
      promise.then(cleanup, cleanup);
      void pump();
      return promise;
    },

    get pending() {
      return queue.length + inflight.size;
    },
  };
}
