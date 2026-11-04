import { describe, expect, it, vi } from "vitest";
import { createMusicBrainzServerService } from "./service";
import type { MusicBrainzClient } from "./client";
import { GraphServiceError } from "@/lib/graphErrors";
import type {
  MBReleaseBrowseResponse,
  MBReleaseGroupBrowseResponse,
} from "./types";
import browseLabelFixture from "./__fixtures__/browse-releases-by-label.json";
import browseRgFixture from "./__fixtures__/browse-release-groups-by-artist.json";
import browseRelByRgFixture from "./__fixtures__/browse-releases-by-release-group.json";
import lookupReleaseFixture from "./__fixtures__/lookup-release.json";
import lookupReleaseGroupFixture from "./__fixtures__/lookup-release-group.json";
import lookupRecordingFixture from "./__fixtures__/lookup-recording.json";
import searchLabelsFixture from "./__fixtures__/search-labels.json";
import searchReleaseGroupsFixture from "./__fixtures__/search-release-groups.json";
import searchRecordingsFixture from "./__fixtures__/search-recordings.json";

const LABEL_MBID = "29c1256a-d989-4035-a856-95d707e2082c";
const ARTIST_MBID = "fa0e2024-95ff-44b6-9a86-f0ab120b6a72";
const GROUP_MBID = "48117b90-a16e-34ca-a514-19c702df1158";
const RECORDING_MBID = "60fa767a-d85d-4991-82bc-4294e0b11ae7";

function fakeClient(overrides: Partial<MusicBrainzClient> = {}) {
  return {
    browseReleasesByLabel: vi.fn(() =>
      Promise.resolve(browseLabelFixture as unknown as MBReleaseBrowseResponse)
    ),
    browseReleasesByArtist: vi.fn(() =>
      Promise.resolve(browseLabelFixture as unknown as MBReleaseBrowseResponse)
    ),
    browseReleaseGroupsByArtist: vi.fn(() =>
      Promise.resolve(
        browseRgFixture as unknown as MBReleaseGroupBrowseResponse
      )
    ),
    browseReleasesByReleaseGroup: vi.fn(() =>
      Promise.resolve(
        browseRelByRgFixture as unknown as MBReleaseBrowseResponse
      )
    ),
    lookupRelease: vi.fn(() => Promise.resolve(lookupReleaseFixture)),
    lookupReleaseGroup: vi.fn(() =>
      Promise.resolve(lookupReleaseGroupFixture)
    ),
    lookupRecording: vi.fn(() => Promise.resolve(lookupRecordingFixture)),
    lookupLabel: vi.fn(() => Promise.resolve({ id: LABEL_MBID, name: "SR" })),
    lookupArtist: vi.fn(() =>
      Promise.resolve({ id: ARTIST_MBID, name: "Todd" })
    ),
    searchLabels: vi.fn(() => Promise.resolve(searchLabelsFixture)),
    searchArtists: vi.fn(() => Promise.resolve({ artists: [] })),
    searchReleaseGroups: vi.fn(() =>
      Promise.resolve(searchReleaseGroupsFixture)
    ),
    searchRecordings: vi.fn(() => Promise.resolve(searchRecordingsFixture)),
    searchReleases: vi.fn(() => Promise.resolve({ releases: [] })),
    ...overrides,
  } as unknown as MusicBrainzClient;
}

describe("createMusicBrainzServerService", () => {
  it("searches by type", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const res = await svc.search("strictly", "label", 10);
    expect(res.label.length).toBeGreaterThan(0);
    expect(client.searchLabels).toHaveBeenCalledWith("strictly", {
      limit: 10,
      offset: 0,
    });
  });

  it("expands a label into a releases page", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const page = await svc.getConnections("label", LABEL_MBID, {
      cursor: null,
      limit: 12,
    });
    expect(client.browseReleasesByLabel).toHaveBeenCalledWith(LABEL_MBID, {
      limit: 12,
      offset: 0,
    });
    expect(page.entities.every((e) => e.type === "release")).toBe(true);
    expect(
      page.relationships.every(
        (r) => r.type === "released_on" && r.target === `mb:label:${LABEL_MBID}`
      )
    ).toBe(true);
  });

  it("searches release groups and recordings", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const rg = await svc.search("discovery", "release-group", 10);
    expect(client.searchReleaseGroups).toHaveBeenCalledWith("discovery", {
      limit: 10,
      offset: 0,
    });
    expect(rg["release-group"].length).toBeGreaterThan(0);
    const rec = await svc.search("one more time", "recording", 10);
    expect(client.searchRecordings).toHaveBeenCalledWith("one more time", {
      limit: 10,
      offset: 0,
    });
    expect(rec.recording.length).toBeGreaterThan(0);
  });

  it("looks up release-group and recording entities", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const rg = await svc.getEntity("release-group", GROUP_MBID);
    expect(client.lookupReleaseGroup).toHaveBeenCalledWith(GROUP_MBID);
    expect(rg?.type).toBe("release-group");
    const rec = await svc.getEntity("recording", RECORDING_MBID);
    expect(client.lookupRecording).toHaveBeenCalledWith(RECORDING_MBID);
    expect(rec?.type).toBe("recording");
  });

  it("expands an artist into release groups with credited_to edges", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const page = await svc.getConnections("artist", ARTIST_MBID, {
      cursor: null,
      limit: 12,
    });
    expect(client.browseReleaseGroupsByArtist).toHaveBeenCalledWith(
      ARTIST_MBID,
      { limit: 12, offset: 0 }
    );
    expect(client.browseReleasesByArtist).not.toHaveBeenCalled();
    expect(page.entities.every((e) => e.type === "release-group")).toBe(true);
    expect(page.relationships.every((r) => r.type === "credited_to")).toBe(true);
  });

  it("expands a release-group into releases with version_of edges", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const page = await svc.getConnections("release-group", GROUP_MBID, {
      cursor: null,
      limit: 12,
    });
    expect(client.browseReleasesByReleaseGroup).toHaveBeenCalledWith(
      GROUP_MBID,
      { limit: 12, offset: 0 }
    );
    expect(page.entities.every((e) => e.type === "release")).toBe(true);
    expect(
      page.relationships.every(
        (r) =>
          r.type === "version_of" &&
          r.target === `mb:release-group:${GROUP_MBID}`
      )
    ).toBe(true);
  });

  it("expands a recording into artists + releases and rejects cursors", async () => {
    const svc = createMusicBrainzServerService(fakeClient());
    const page = await svc.getConnections("recording", RECORDING_MBID, {
      cursor: null,
      limit: 12,
    });
    const types = new Set(page.relationships.map((r) => r.type));
    expect(types.has("credited_to")).toBe(true);
    expect(types.has("appears_on")).toBe(true);
    await expect(
      svc.getConnections("recording", RECORDING_MBID, {
        cursor: "x:1",
        limit: 12,
      })
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("decodes cursors into offsets for the next page", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const page1 = await svc.getConnections("label", LABEL_MBID, {
      cursor: null,
      limit: 3,
    });
    if (!page1.nextCursor) throw new Error("expected a nextCursor");
    await svc.getConnections("label", LABEL_MBID, {
      cursor: page1.nextCursor,
      limit: 3,
    });
    expect(client.browseReleasesByLabel).toHaveBeenLastCalledWith(LABEL_MBID, {
      limit: 3,
      offset: (browseLabelFixture as MBReleaseBrowseResponse).releases.length,
    });
  });

  it("rejects a cursor that does not match the entity", async () => {
    const svc = createMusicBrainzServerService(fakeClient());
    await expect(
      svc.getConnections("label", LABEL_MBID, {
        cursor: `${ARTIST_MBID}:3`,
        limit: 3,
      })
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      svc.getConnections("label", LABEL_MBID, {
        cursor: "garbage",
        limit: 3,
      })
    ).rejects.toBeInstanceOf(GraphServiceError);
  });

  it("expands a release into credits + label and rejects cursors", async () => {
    const svc = createMusicBrainzServerService(fakeClient());
    const page = await svc.getConnections(
      "release",
      lookupReleaseFixture.id,
      { cursor: null, limit: 12 }
    );
    expect(
      page.relationships.some((r) => r.type === "credited_to")
    ).toBe(true);
    await expect(
      svc.getConnections("release", lookupReleaseFixture.id, {
        cursor: "x:1",
        limit: 12,
      })
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("propagates not_found from the client", async () => {
    const client = fakeClient({
      lookupLabel: () =>
        Promise.reject(new GraphServiceError("not_found", "nope")),
    });
    const svc = createMusicBrainzServerService(client);
    await expect(svc.getEntity("label", LABEL_MBID)).rejects.toMatchObject({
      kind: "not_found",
    });
  });
});
