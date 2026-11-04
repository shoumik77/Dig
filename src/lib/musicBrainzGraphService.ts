// Client-side GraphService backed by the /api/music route handlers.
import { GraphServiceError, type GraphErrorKind } from "./graphErrors";
import type { GraphService } from "./graphService";
import { parseMbId } from "./mbIds";
import type { ConnectionsPage, SearchResults } from "@/types/graph";
import type { EntityType, MusicEntity } from "@/types/music";

interface Envelope<T> {
  ok: boolean;
  data?: T;
  error?: { kind?: GraphErrorKind; message?: string; retryAfterMs?: number };
}

export interface MusicBrainzGraphServiceOpts {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export function createMusicBrainzGraphService(
  opts: MusicBrainzGraphServiceOpts = {}
): GraphService {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const baseUrl = opts.baseUrl ?? "/api/music";

  async function get<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`);
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

  function searchPath(query: string, type: EntityType, limit: number): string {
    const params = new URLSearchParams({
      q: query,
      type,
      limit: String(limit),
    });
    return `/search?${params}`;
  }

  return {
    providerId: "musicbrainz",

    async getEntity(id) {
      const parsed = parseMbId(id);
      if (!parsed) return undefined;
      try {
        return await get<MusicEntity>(
          `/entities/${parsed.type}/${parsed.mbid}`
        );
      } catch (err) {
        if (err instanceof GraphServiceError && err.kind === "not_found") {
          return undefined;
        }
        throw err;
      }
    },

    getConnections(id, q = {}) {
      const parsed = parseMbId(id);
      if (!parsed) {
        return Promise.resolve({
          entities: [],
          relationships: [],
          nextCursor: null,
          total: 0,
        });
      }
      const params = new URLSearchParams();
      if (q.cursor != null) params.set("cursor", q.cursor);
      if (q.limit != null) params.set("limit", String(q.limit));
      const suffix = params.size ? `?${params}` : "";
      return get<ConnectionsPage>(
        `/entities/${parsed.type}/${parsed.mbid}/connections${suffix}`
      );
    },

    searchEntities(query, q = {}) {
      const type = q.type ?? "label";
      return get<SearchResults>(searchPath(query, type, 10));
    },

    getDefaultRootId() {
      return Promise.resolve(null);
    },
  };
}
