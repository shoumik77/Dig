import "server-only";
import { GraphServiceError } from "@/lib/graphErrors";
import { parseMbId } from "@/lib/mbIds";
import type { DiscogsEnrichment } from "@/types/music";
import { musicBrainzServerService } from "../musicbrainz/service";
import { discogsClient, type DiscogsClient } from "./client";
import { isDiscogsEnabled } from "./config";
import { toEnrichment } from "./normalize";

export interface DiscogsServiceDeps {
  mb?: { getEntity: typeof musicBrainzServerService.getEntity };
  client?: DiscogsClient;
  enabled?: boolean;
}

/**
 * Lazy enrichment: MB entity (cached lookup) → refs.discogs → Discogs
 * lookup. Returns null when Discogs is disabled, the entity has no
 * Discogs ref, the type is "recording" (no Discogs concept), or the
 * Discogs object 404s. Never on the graph-expansion path.
 */
export async function getEnrichment(
  entityId: string,
  deps: DiscogsServiceDeps = {}
): Promise<DiscogsEnrichment | null> {
  const enabled = deps.enabled ?? isDiscogsEnabled();
  if (!enabled) return null;

  const mb = deps.mb ?? musicBrainzServerService;
  const client = deps.client ?? discogsClient;

  const parsed = parseMbId(entityId);
  if (!parsed || parsed.type === "recording") return null;
  const entity = await mb.getEntity(parsed.type, parsed.mbid);
  const ref = entity?.refs?.discogs;
  if (!ref) return null;

  try {
    switch (ref.kind) {
      case "release":
        return toEnrichment("release", await client.getRelease(ref.id));
      case "master":
        return toEnrichment("master", await client.getMaster(ref.id));
      case "artist":
        return toEnrichment("artist", await client.getArtist(ref.id));
      case "label":
        return toEnrichment("label", await client.getLabel(ref.id));
    }
  } catch (err) {
    if (err instanceof GraphServiceError && err.kind === "not_found") {
      return null;
    }
    throw err;
  }
}

export function getCapabilities(): { discogs: boolean } {
  return { discogs: isDiscogsEnabled() };
}
