import { describe, expect, it, vi } from "vitest";
import { createMusicBrainzServerService } from "./service";
import type { MusicBrainzClient } from "./client";
import { GraphServiceError } from "@/lib/graphErrors";
import type { MBReleaseBrowseResponse } from "./types";
import browseLabelFixture from "./__fixtures__/browse-releases-by-label.json";
import lookupReleaseFixture from "./__fixtures__/lookup-release.json";
import searchLabelsFixture from "./__fixtures__/search-labels.json";

const LABEL_MBID = "29c1256a-d989-4035-a856-95d707e2082c";
const ARTIST_MBID = "fa0e2024-95ff-44b6-9a86-f0ab120b6a72";

function fakeClient(overrides: Partial<MusicBrainzClient> = {}) {
  return {
    browseReleasesByLabel: vi.fn(() =>
      Promise.resolve(browseLabelFixture as unknown as MBReleaseBrowseResponse)
    ),
    browseReleasesByArtist: vi.fn(() =>
      Promise.resolve(browseLabelFixture as unknown as MBReleaseBrowseResponse)
    ),
    lookupRelease: vi.fn(() => Promise.resolve(lookupReleaseFixture)),
    lookupLabel: vi.fn(() => Promise.resolve({ id: LABEL_MBID, name: "SR" })),
    lookupArtist: vi.fn(() =>
      Promise.resolve({ id: ARTIST_MBID, name: "Todd" })
    ),
    searchLabels: vi.fn(() => Promise.resolve(searchLabelsFixture)),
    searchArtists: vi.fn(() => Promise.resolve({ artists: [] })),
    searchReleases: vi.fn(() => Promise.resolve({ releases: [] })),
    ...overrides,
  } as unknown as MusicBrainzClient;
}

describe("createMusicBrainzServerService", () => {
  it("searches by type", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const res = await svc.search("strictly", "label", 10);
    expect(res.labels.length).toBeGreaterThan(0);
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

  it("expands an artist with credited_to edges", async () => {
    const client = fakeClient();
    const svc = createMusicBrainzServerService(client);
    const page = await svc.getConnections("artist", ARTIST_MBID, {
      cursor: null,
      limit: 12,
    });
    expect(client.browseReleasesByArtist).toHaveBeenCalled();
    expect(page.relationships.every((r) => r.type === "credited_to")).toBe(true);
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
