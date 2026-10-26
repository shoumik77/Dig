import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRequestScheduler } from "./scheduler";
import { GraphServiceError } from "@/lib/graphErrors";

const OPTS = {
  minIntervalMs: 1000,
  maxQueue: 50,
  maxRetries: 3,
  timeoutMs: 10_000,
  headers: { "User-Agent": "test/1.0" },
};

function jsonResponse(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const status = init.status ?? 200;
  const headers = init.headers ?? {};
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k: string) => headers[k] ?? null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("createRequestScheduler", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("spaces two dispatches at least minIntervalMs apart", async () => {
    const times: number[] = [];
    const fetchImpl = vi.fn(() => {
      times.push(Date.now());
      return Promise.resolve(jsonResponse({ ok: 1 }));
    });
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const a = s.request("http://x/a");
    const b = s.request("http://x/b");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await Promise.all([a, b]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(1000);
  });

  it("dedupes concurrent requests for the same URL", async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(jsonResponse({ v: 1 })));
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const [a, b] = await Promise.all([
      s.request("http://x/same"),
      s.request("http://x/same"),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(a).toEqual({ v: 1 });
    expect(b).toEqual({ v: 1 });
  });

  it("retries a 503 after backoff and resolves on success", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/retry");
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("honors Retry-After seconds on 429", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({}, { status: 429, headers: { "Retry-After": "2" } })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true }));
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/rate");
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(1999);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(p).resolves.toEqual({ ok: true });
  });

  it("aborts on timeout and rejects with kind timeout", async () => {
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => {
          init?.signal?.addEventListener("abort", () =>
            rej(new DOMException("aborted", "AbortError"))
          );
        })
    );
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/slow");
    const assertion = expect(p).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(OPTS.timeoutMs);
    await assertion;
  });

  it("exhausts retries on persistent 503 -> upstream after maxRetries+1 fetches", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({}, { status: 503 }))
    );
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/dead");
    const assertion = expect(p).rejects.toMatchObject({
      kind: "upstream",
      retryable: true,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(OPTS.maxRetries + 1);
  });

  it("rejects persistent 429 as rate_limited", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({}, { status: 429 }))
    );
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/throttled");
    const assertion = expect(p).rejects.toMatchObject({ kind: "rate_limited" });
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it("never retries a 400 and reports kind invalid", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve(jsonResponse({}, { status: 400 }))
    );
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/bad");
    const assertion = expect(p).rejects.toMatchObject({
      kind: "invalid",
      retryable: false,
    });
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects immediately with rate_limited when the queue is full", async () => {
    const fetchImpl = vi.fn(() => new Promise<Response>(() => {}));
    const s = createRequestScheduler({ ...OPTS, maxQueue: 1, fetchImpl });
    void s.request("http://x/1");
    void s.request("http://x/2").catch(() => {});
    await vi.advanceTimersByTimeAsync(0);
    await expect(s.request("http://x/3")).rejects.toMatchObject({
      kind: "rate_limited",
    });
  });

  it("maps invalid JSON to an upstream error", async () => {
    const fetchImpl = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: () => Promise.reject(new SyntaxError("bad json")),
      } as unknown as Response)
    );
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/html");
    const assertion = expect(p).rejects.toMatchObject({ kind: "upstream" });
    await vi.advanceTimersByTimeAsync(60_000);
    await assertion;
  });

  it("maps a fetch TypeError to a network error", async () => {
    const fetchImpl = vi.fn(() => Promise.reject(new TypeError("failed")));
    const s = createRequestScheduler({ ...OPTS, fetchImpl });
    const p = s.request("http://x/net").catch((e) => e);
    await vi.advanceTimersByTimeAsync(0);
    const err = await p;
    expect(err).toBeInstanceOf(GraphServiceError);
    expect((err as GraphServiceError).kind).toBe("network");
  });
});
