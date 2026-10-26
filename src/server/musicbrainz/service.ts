import "server-only";
import { GraphServiceError } from "@/lib/graphErrors";
import { formatMbId } from "@/lib/mbIds";
import type { ConnectionsPage, SearchResults } from "@/types/graph";
import type { EntityType, MusicEntity } from "@/types/music";
import { musicBrainzClient, type MusicBrainzClient } from "./client";
import {
  decodeCursor,
  normalizeArtist,
  normalizeLabel,
  normalizeRelease,
  normalizeSearch,
  releaseConnections,
  releasesPage,
} from "./normalize";

export interface MusicBrainzServerService {
  search(q: string, type: EntityType, limit: number): Promise<SearchResults>;
  getEntity(type: EntityType, mbid: string): Promise<MusicEntity | null>;
  getConnections(
    type: EntityType,
    mbid: string,
    q: { cursor: string | null; limit: number }
  ): Promise<ConnectionsPage>;
}

export function createMusicBrainzServerService(
  client: MusicBrainzClient
): MusicBrainzServerService {
  return {
    async search(q, type, limit) {
      const offset = 0;
      if (type === "label") {
        return normalizeSearch(
          "label",
          await client.searchLabels(q, { limit, offset })
        );
      }
      if (type === "artist") {
        return normalizeSearch(
          "artist",
          await client.searchArtists(q, { limit, offset })
        );
      }
      return normalizeSearch(
        "release",
        await client.searchReleases(q, { limit, offset })
      );
    },

    async getEntity(type, mbid) {
      if (type === "label") {
        const raw = await client.lookupLabel(mbid);
        return raw ? normalizeLabel(raw) : null;
      }
      if (type === "artist") {
        const raw = await client.lookupArtist(mbid);
        return raw ? normalizeArtist(raw) : null;
      }
      const raw = await client.lookupRelease(mbid);
      return raw ? normalizeRelease(raw) : null;
    },

    async getConnections(type, mbid, { cursor, limit }) {
      const parentId = formatMbId(type, mbid);

      if (type === "release") {
        // Releases are single-page; any cursor is meaningless.
        if (cursor != null) {
          throw new GraphServiceError(
            "invalid",
            "Releases have a single connections page"
          );
        }
        return releaseConnections(await client.lookupRelease(mbid));
      }

      let offset = 0;
      if (cursor != null) {
        const decoded = decodeCursor(cursor, mbid);
        if (decoded === null) {
          throw new GraphServiceError(
            "invalid",
            `Malformed or mismatched cursor: ${cursor}`
          );
        }
        offset = decoded;
      }

      const raw =
        type === "label"
          ? await client.browseReleasesByLabel(mbid, { limit, offset })
          : await client.browseReleasesByArtist(mbid, { limit, offset });
      return releasesPage({ id: parentId, type }, raw, offset);
    },
  };
}

export const musicBrainzServerService =
  createMusicBrainzServerService(musicBrainzClient);
