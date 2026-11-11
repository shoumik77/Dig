// Client-side crate store backed by the /api/crates route handlers.
import { GraphServiceError, type GraphErrorKind } from "./graphErrors";
import type {
  Crate,
  CrateDetail,
  CrateItem,
  CrateSummary,
} from "@/types/crate";
import type { MusicEntity } from "@/types/music";

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: { kind?: GraphErrorKind; message?: string; retryAfterMs?: number };
}

export interface CrateServiceOpts {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export interface CrateService {
  list(): Promise<CrateSummary[]>;
  create(name: string): Promise<Crate>;
  getDetail(id: string): Promise<CrateDetail>;
  rename(id: string, name: string): Promise<Crate>;
  remove(id: string): Promise<{ id: string }>;
  saveItem(crateId: string, entity: MusicEntity): Promise<CrateItem>;
  removeItem(crateId: string, entityId: string): Promise<{ entityId: string }>;
}

export function createCrateService(opts: CrateServiceOpts = {}): CrateService {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? "/api/crates";

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, init);
    } catch (err) {
      throw new GraphServiceError("network", `Network failure: ${path}`, {
        cause: err,
      });
    }
    let body: Envelope<T>;
    try {
      body = (await res.json()) as Envelope<T>;
    } catch (err) {
      throw new GraphServiceError(
        "upstream",
        `Bad response envelope: ${path}`,
        { cause: err }
      );
    }
    if (!res.ok || !body.ok || body.data === undefined) {
      const kind = body.error?.kind ?? "upstream";
      throw new GraphServiceError(
        kind,
        body.error?.message ?? `Request failed (${res.status}): ${path}`,
        { retryAfterMs: body.error?.retryAfterMs }
      );
    }
    return body.data;
  }

  function json(method: string, payload: unknown): RequestInit {
    return {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    };
  }

  const cratePath = (id: string) => `/${encodeURIComponent(id)}`;

  return {
    list() {
      return request<CrateSummary[]>("");
    },

    create(name) {
      return request<Crate>("", json("POST", { name }));
    },

    getDetail(id) {
      return request<CrateDetail>(cratePath(id));
    },

    rename(id, name) {
      return request<Crate>(cratePath(id), json("PATCH", { name }));
    },

    remove(id) {
      return request<{ id: string }>(cratePath(id), { method: "DELETE" });
    },

    saveItem(crateId, entity) {
      return request<CrateItem>(
        `${cratePath(crateId)}/items`,
        json("POST", { entity })
      );
    },

    removeItem(crateId, entityId) {
      return request<{ entityId: string }>(
        `${cratePath(crateId)}/items/${encodeURIComponent(entityId)}`,
        { method: "DELETE" }
      );
    },
  };
}
