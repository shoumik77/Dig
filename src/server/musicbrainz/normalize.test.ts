import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  edgeId,
  encodeCursor,
  normalizeArtist,
  normalizeLabel,
  normalizeRecording,
  normalizeRelease,
  normalizeReleaseGroup,
  normalizeSearch,
  recordingConnections,
  releaseConnections,
  releaseGroupsPage,
  releasesByGroupPage,
  releasesPage,
} from "./normalize";
import type {
  MBArtist,
  MBLabel,
  MBRecording,
  MBRelease,
  MBReleaseBrowseResponse,
  MBReleaseGroup,
  MBReleaseGroupBrowseResponse,
} from "./types";
import searchLabelsFixture from "./__fixtures__/search-labels.json";
import searchReleaseGroupsFixture from "./__fixtures__/search-release-groups.json";
import searchRecordingsFixture from "./__fixtures__/search-recordings.json";
import lookupReleaseFixture from "./__fixtures__/lookup-release.json";
import lookupArtistFixture from "./__fixtures__/lookup-artist.json";
import lookupLabelFixture from "./__fixtures__/lookup-label.json";
import lookupReleaseGroupFixture from "./__fixtures__/lookup-release-group.json";
import lookupRecordingFixture from "./__fixtures__/lookup-recording.json";
import lookupReleaseTracksFixture from "./__fixtures__/lookup-release-with-tracks.json";
import browseLabelFixture from "./__fixtures__/browse-releases-by-label.json";
import browseRgFixture from "./__fixtures__/browse-release-groups-by-artist.json";
import browseRelByRgFixture from "./__fixtures__/browse-releases-by-release-group.json";

const UUID_A = "7160d072-a100-41c5-8482-00d20f273a19";
const UUID_B = "29c1256a-d989-4035-a856-95d707e2082c";
const ARTIST_MBID = "f275d9a5-3271-436b-8c32-806ec275e23c";

describe("normalize", () => {
  it("normalizeLabel maps a real MB label", () => {
    const e = normalizeLabel(lookupLabelFixture as MBLabel);
    expect(e.id).toBe("mb:label:29c1256a-d989-4035-a856-95d707e2082c");
    expect(e.name).toBe("Strictly Rhythm");
    expect(e.type).toBe("label");
    expect(e.provenance).toBe("verified");
    expect(e.source).toEqual({
      provider: "musicbrainz",
      id: "29c1256a-d989-4035-a856-95d707e2082c",
      url: "https://musicbrainz.org/label/29c1256a-d989-4035-a856-95d707e2082c",
    });
    expect(e.metadata).toMatchObject({
      country: "US",
      foundedDate: "1989",
    });
  });

  it("normalizeArtist maps type/country/aliases", () => {
    const e = normalizeArtist(lookupArtistFixture as MBArtist);
    expect(e.id).toBe("mb:artist:fa0e2024-95ff-44b6-9a86-f0ab120b6a72");
    expect(e.metadata).toMatchObject({
      artistType: "Person",
      country: "US",
    });
    const aliases = (e.metadata as ArtistMetadataShape).aliases;
    expect(aliases?.length).toBeGreaterThan(0);
    expect(new Set(aliases).size).toBe(aliases?.length);
  });

  it("normalizeRelease maps date/country/status/catalog/format/artistCredit", () => {
    const e = normalizeRelease(lookupReleaseFixture as MBRelease);
    expect(e.type).toBe("release");
    expect(e.name).toBe(lookupReleaseFixture.title);
    const meta = e.metadata as ReleaseMetadataShape;
    expect(meta.catalogNumber).toBe("SR 1200");
    expect(meta.format).toContain("Vinyl");
    expect(meta.artistCredit).toBeTruthy();
  });

  it("omits missing optional fields entirely", () => {
    const e = normalizeLabel({ id: UUID_B, name: "X" } as MBLabel);
    expect(e.metadata).toBeUndefined();
    const a = normalizeRelease({
      id: UUID_A,
      title: "T",
    } as MBRelease);
    expect(a.metadata).toBeUndefined();
  });

  it("releaseConnections builds credited_to and released_on edges", () => {
    const page = releaseConnections(lookupReleaseFixture as MBRelease);
    const releaseId = `mb:release:${lookupReleaseFixture.id}`;
    const types = page.relationships.map((r) => r.type);
    expect(types).toContain("credited_to");
    expect(types).toContain("released_on");
    for (const rel of page.relationships) {
      expect(rel.source).toBe(releaseId);
      expect(rel.id).toBe(edgeId(rel.source, rel.target, rel.type));
    }
    expect(page.total).toBe(page.relationships.length);
    expect(page.nextCursor).toBeNull();
  });

  it("dedupes repeated credits and skips text-only credits", () => {
    const raw = {
      id: UUID_A,
      title: "T",
      "artist-credit": [
        { name: "X", joinphrase: "", artist: { id: UUID_B, name: "X" } },
        { name: "X", joinphrase: " feat. ", artist: { id: UUID_B, name: "X" } },
        { name: "anonymous voice" }, // no artist
      ],
      "label-info": [{ "catalog-number": "C1" }], // no label
    } as unknown as MBRelease;
    const page = releaseConnections(raw);
    expect(page.relationships).toHaveLength(1);
    expect(page.entities).toHaveLength(1);
    expect(page.entities[0].id).toBe(`mb:artist:${UUID_B}`);
  });

  it("multiple distinct credits produce an edge each", () => {
    const raw = {
      id: UUID_A,
      title: "T",
      "artist-credit": [
        { name: "A", artist: { id: UUID_B, name: "A" } },
        {
          name: "B",
          artist: { id: "fa0e2024-95ff-44b6-9a86-f0ab120b6a72", name: "B" },
        },
      ],
    } as unknown as MBRelease;
    expect(releaseConnections(raw).relationships).toHaveLength(2);
  });

  it("releasesPage paginates by release-count and encodes cursors", () => {
    const raw = browseLabelFixture as unknown as MBReleaseBrowseResponse;
    const parent = {
      id: "mb:label:29c1256a-d989-4035-a856-95d707e2082c",
      type: "label" as const,
    };
    const page = releasesPage(parent, raw, 0);
    expect(page.total).toBe(raw["release-count"]);
    expect(page.relationships.length).toBe(raw.releases.length);
    for (const rel of page.relationships) {
      expect(rel.type).toBe("released_on");
      expect(rel.target).toBe(parent.id);
    }
    if (raw.releases.length < raw["release-count"]) {
      expect(page.nextCursor).toBe(
        encodeCursor(parent.id.split(":")[2], raw.releases.length)
      );
    }
    const last = releasesPage(
      parent,
      { "release-count": 5, "release-offset": 2, releases: raw.releases },
      2
    );
    expect(last.nextCursor).toBeNull();
    const empty = releasesPage(
      parent,
      { "release-count": 10, "release-offset": 0, releases: [] },
      0
    );
    expect(empty.nextCursor).toBeNull();
  });

  it("artist browse pages use credited_to edges", () => {
    const raw = browseLabelFixture as unknown as MBReleaseBrowseResponse;
    const page = releasesPage(
      { id: `mb:artist:${UUID_A}`, type: "artist" },
      raw,
      0
    );
    expect(page.relationships.every((r) => r.type === "credited_to")).toBe(true);
  });

  it("cursor round-trips and rejects bad input", () => {
    expect(decodeCursor(encodeCursor(UUID_B, 24), UUID_B)).toBe(24);
    expect(decodeCursor("abc", UUID_B)).toBeNull();
    expect(decodeCursor(`${UUID_A}:5`, UUID_B)).toBeNull();
    expect(decodeCursor(`${UUID_B}:-1`, UUID_B)).toBeNull();
    expect(decodeCursor(`${UUID_B}:1.5`, UUID_B)).toBeNull();
    expect(decodeCursor(`${UUID_B}:1000001`, UUID_B)).toBeNull();
  });

  it("normalizeSearch fills only the requested group", () => {
    const res = normalizeSearch("label", {
      labels: (searchLabelsFixture as unknown as { labels: MBLabel[] }).labels,
    });
    expect(res.label.length).toBeGreaterThan(0);
    expect(res.artist).toEqual([]);
    expect(res["release-group"]).toEqual([]);
    expect(res.release).toEqual([]);
    expect(res.recording).toEqual([]);
  });

  it("normalizeSearch covers release groups and recordings", () => {
    const rg = normalizeSearch("release-group", {
      "release-groups": (
        searchReleaseGroupsFixture as unknown as {
          "release-groups": MBReleaseGroup[];
        }
      )["release-groups"],
    });
    expect(rg["release-group"].length).toBeGreaterThan(0);
    expect(rg["release-group"][0].type).toBe("release-group");
    expect(rg.release).toEqual([]);

    const rec = normalizeSearch("recording", {
      recordings: (
        searchRecordingsFixture as unknown as { recordings: MBRecording[] }
      ).recordings,
    });
    expect(rec.recording.length).toBeGreaterThan(0);
    expect(rec.recording[0].type).toBe("recording");
    expect(rec.recording[0].id.startsWith("mb:recording:")).toBe(true);
  });
});

describe("release groups and recordings", () => {
  it("normalizeReleaseGroup maps primary/secondary types and credit", () => {
    const e = normalizeReleaseGroup(
      lookupReleaseGroupFixture as unknown as MBReleaseGroup
    );
    expect(e.id).toBe(`mb:release-group:${lookupReleaseGroupFixture.id}`);
    expect(e.type).toBe("release-group");
    expect(e.name).toBe(lookupReleaseGroupFixture.title);
    const meta = e.metadata as {
      primaryType?: string;
      firstReleaseDate?: string;
      artistCredit?: string;
    };
    expect(meta.primaryType).toBe("Album");
    expect(meta.firstReleaseDate).toBe("2001-02-26");
    expect(meta.artistCredit).toContain("Daft Punk");
    expect(e.source?.url).toBe(
      `https://musicbrainz.org/release-group/${lookupReleaseGroupFixture.id}`
    );
  });

  it("normalizeRecording maps length, isrcs and credit", () => {
    const e = normalizeRecording(
      lookupRecordingFixture as unknown as MBRecording
    );
    expect(e.id).toBe(`mb:recording:${lookupRecordingFixture.id}`);
    expect(e.type).toBe("recording");
    const meta = e.metadata as {
      lengthMs?: number;
      isrcs?: string[];
      artistCredit?: string;
    };
    expect(meta.lengthMs).toBe(320746);
    expect(meta.isrcs).toContain("GBAHT1305744");
    expect(meta.artistCredit).toContain("Daft Punk");
  });

  it("normalizeRelease emits ordered tracks with mb:recording ids", () => {
    const e = normalizeRelease(
      lookupReleaseTracksFixture as unknown as MBRelease
    );
    const tracks = (e.metadata as { tracks?: ReleaseTrackShape[] }).tracks;
    expect(tracks).toBeDefined();
    const positions = tracks!.map((t) => t.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    for (const t of tracks!) {
      expect(t.recordingId.startsWith("mb:recording:")).toBe(true);
      // single-medium release: no medium field
      expect(t.medium).toBeUndefined();
    }
  });

  it("orders tracks across media and tags them with the medium", () => {
    const rec = (n: number) => ({
      id: `11111111-1111-4111-8111-11111111111${n}`,
      title: `R${n}`,
    });
    const raw = {
      id: UUID_A,
      title: "T",
      media: [
        {
          position: 2,
          "track-count": 1,
          tracks: [{ position: 1, number: "B1", title: "B", recording: rec(1) }],
        },
        {
          position: 1,
          "track-count": 2,
          tracks: [
            { position: 2, number: "A2", title: "A2", recording: rec(2) },
            { position: 1, number: "A1", title: "A1", recording: rec(3) },
          ],
        },
      ],
    } as unknown as MBRelease;
    const tracks = (
      normalizeRelease(raw).metadata as { tracks?: ReleaseTrackShape[] }
    ).tracks!;
    expect(tracks.map((t) => t.number)).toEqual(["A1", "A2", "B1"]);
    expect(tracks.map((t) => t.medium)).toEqual([1, 1, 2]);
  });

  it("skips tracks whose recording id is missing or invalid", () => {
    const raw = {
      id: UUID_A,
      title: "T",
      media: [
        {
          position: 1,
          tracks: [
            { position: 1, title: "ok", recording: { id: UUID_B, title: "r" } },
            { position: 2, title: "no-rec" },
            {
              position: 3,
              title: "bad",
              recording: { id: "not-a-uuid", title: "x" },
            },
          ],
        },
      ],
    } as unknown as MBRelease;
    const tracks = (
      normalizeRelease(raw).metadata as { tracks?: ReleaseTrackShape[] }
    ).tracks!;
    expect(tracks).toHaveLength(1);
    expect(tracks[0].recordingId).toBe(`mb:recording:${UUID_B}`);
  });

  it("releaseConnections adds the release-group node and version_of edge", () => {
    const page = releaseConnections(
      lookupReleaseTracksFixture as unknown as MBRelease
    );
    const releaseId = `mb:release:${lookupReleaseTracksFixture.id}`;
    const rg = lookupReleaseTracksFixture["release-group"];
    const groupId = `mb:release-group:${rg.id}`;
    expect(page.entities.some((e) => e.id === groupId)).toBe(true);
    const rel = page.relationships.find((r) => r.type === "version_of");
    expect(rel).toMatchObject({ source: releaseId, target: groupId });
  });

  it("releaseConnections dedupes recordings across media and emits appears_on", () => {
    const rec = { id: UUID_B, title: "R" };
    const raw = {
      id: UUID_A,
      title: "T",
      media: [
        { position: 1, tracks: [{ position: 1, title: "a", recording: rec }] },
        {
          position: 2,
          tracks: [
            { position: 1, title: "b", recording: rec },
            {
              position: 2,
              title: "c",
              recording: { id: UUID_B.replace(/.$/, "9"), title: "R2" },
            },
          ],
        },
      ],
    } as unknown as MBRelease;
    const page = releaseConnections(raw);
    const appears = page.relationships.filter((r) => r.type === "appears_on");
    // UUID_B appears on both media but only once; the -9 variant once more
    expect(appears).toHaveLength(2);
    for (const rel of appears) {
      expect(rel.target).toBe(`mb:release:${UUID_A}`);
      expect(rel.source.startsWith("mb:recording:")).toBe(true);
    }
    const recEntities = page.entities.filter((e) => e.type === "recording");
    expect(recEntities).toHaveLength(2);
  });

  it("releaseGroupsPage paginates by release-group-count with credited_to edges", () => {
    const raw =
      browseRgFixture as unknown as MBReleaseGroupBrowseResponse;
    const page = releaseGroupsPage(`mb:artist:${ARTIST_MBID}`, raw, 0);
    expect(page.total).toBe(raw["release-group-count"]);
    expect(
      page.relationships.every(
        (r) =>
          r.type === "credited_to" && r.target === `mb:artist:${ARTIST_MBID}`
      )
    ).toBe(true);
    expect(page.entities.every((e) => e.type === "release-group")).toBe(true);
    expect(page.nextCursor).toBe(
      encodeCursor(ARTIST_MBID, raw["release-groups"].length)
    );
    const last = releaseGroupsPage(
      `mb:artist:${ARTIST_MBID}`,
      {
        "release-group-count": 3,
        "release-group-offset": 0,
        "release-groups": raw["release-groups"],
      },
      0
    );
    expect(last.nextCursor).toBeNull();
  });

  it("releasesByGroupPage emits version_of edges toward the group", () => {
    const raw = browseRelByRgFixture as unknown as MBReleaseBrowseResponse;
    const groupId = `mb:release-group:${UUID_A}`;
    const page = releasesByGroupPage(groupId, raw, 0);
    expect(page.total).toBe(raw["release-count"]);
    expect(
      page.relationships.every(
        (r) => r.type === "version_of" && r.target === groupId
      )
    ).toBe(true);
    expect(page.entities.every((e) => e.type === "release")).toBe(true);
    expect(page.nextCursor).toBe(encodeCursor(UUID_A, raw.releases.length));
  });

  it("recordingConnections emits credited artists and releases, single page", () => {
    const page = recordingConnections(
      lookupRecordingFixture as unknown as MBRecording
    );
    const recId = `mb:recording:${lookupRecordingFixture.id}`;
    const types = new Set(page.relationships.map((r) => r.type));
    expect(types).toEqual(new Set(["credited_to", "appears_on"]));
    for (const rel of page.relationships) {
      expect(rel.source).toBe(recId);
    }
    expect(page.entities.some((e) => e.type === "artist")).toBe(true);
    expect(page.entities.some((e) => e.type === "release")).toBe(true);
    expect(page.nextCursor).toBeNull();
    expect(page.total).toBe(page.relationships.length);
  });
});

interface ReleaseTrackShape {
  position: number;
  number?: string;
  recordingId: string;
  medium?: number;
}

interface ArtistMetadataShape {
  aliases?: string[];
}
interface ReleaseMetadataShape {
  catalogNumber?: string;
  format?: string;
  artistCredit?: string;
}
