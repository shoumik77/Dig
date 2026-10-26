import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  edgeId,
  encodeCursor,
  normalizeArtist,
  normalizeLabel,
  normalizeRelease,
  normalizeSearch,
  releaseConnections,
  releasesPage,
} from "./normalize";
import type {
  MBArtist,
  MBLabel,
  MBRelease,
  MBReleaseBrowseResponse,
} from "./types";
import searchLabelsFixture from "./__fixtures__/search-labels.json";
import lookupReleaseFixture from "./__fixtures__/lookup-release.json";
import lookupArtistFixture from "./__fixtures__/lookup-artist.json";
import lookupLabelFixture from "./__fixtures__/lookup-label.json";
import browseLabelFixture from "./__fixtures__/browse-releases-by-label.json";

const UUID_A = "7160d072-a100-41c5-8482-00d20f273a19";
const UUID_B = "29c1256a-d989-4035-a856-95d707e2082c";

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
    expect(res.labels.length).toBeGreaterThan(0);
    expect(res.artists).toEqual([]);
    expect(res.releases).toEqual([]);
  });
});

interface ArtistMetadataShape {
  aliases?: string[];
}
interface ReleaseMetadataShape {
  catalogNumber?: string;
  format?: string;
  artistCredit?: string;
}
