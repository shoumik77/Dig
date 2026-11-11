import { describe, expect, it } from "vitest";
import { stripDiscogsMarkup, toEnrichment } from "./normalize";
import type { DGArtist, DGLabel, DGMaster, DGRelease } from "./types";
import releaseFixture from "./__fixtures__/release.json";
import masterFixture from "./__fixtures__/master.json";
import artistFixture from "./__fixtures__/artist.json";
import labelFixture from "./__fixtures__/label.json";

describe("stripDiscogsMarkup", () => {
  it("strips artist/label/url markup to plain text", () => {
    expect(stripDiscogsMarkup("[a=Gladys Pizarro] and [l=Strictly Rhythm]")).toBe(
      "Gladys Pizarro and Strictly Rhythm"
    );
    expect(stripDiscogsMarkup("see [a123] on [r=456]")).toBe("see on");
    expect(
      stripDiscogsMarkup("check [url=https://x.com]the site[/url] now")
    ).toBe("check the site now");
    expect(stripDiscogsMarkup("[i]italic[/i]")).toBe("italic");
  });
});

describe("toEnrichment", () => {
  it("maps a release: image, genres, credits, videos, community", () => {
    const e = toEnrichment("release", releaseFixture as DGRelease);
    expect(e.kind).toBe("release");
    expect(e.id).toBe(750726);
    expect(e.url).toBe(releaseFixture.uri);
    expect(e.imageUrl).toBe(releaseFixture.images[0].uri);
    expect(e.genres).toEqual(["Electronic"]);
    expect(e.styles).toEqual(["House"]);
    expect(
      e.credits?.some(
        (c) => c.name === "Louie Vega" && c.role === "Producer"
      )
    ).toBe(true);
    // youtube only, vimeo filtered
    expect(e.videos?.every((v) => /youtu\.?be/.test(v.url))).toBe(true);
    expect(e.videos?.[0].durationSec).toBe(391);
    expect(e.community).toEqual({ have: 30, want: 729 });
    expect(e.formats?.[0]).toContain("Vinyl");
  });

  it("prefers primary image and falls back to the first image", () => {
    const e = toEnrichment("master", masterFixture as DGMaster);
    expect(e.kind).toBe("master");
    const primary = masterFixture.images.find((i) => i.type === "primary");
    expect(e.imageUrl).toBe((primary ?? masterFixture.images[0]).uri);
    expect(e.genres).toContain("Electronic");
  });

  it("dedupes videos by URL and drops non-youtube", () => {
    const e = toEnrichment("release", {
      id: 1,
      videos: [
        { uri: "https://www.youtube.com/watch?v=a", title: "A", duration: 10 },
        { uri: "https://www.youtube.com/watch?v=a", title: "A2" },
        { uri: "https://vimeo.com/1", title: "V" },
        { uri: "https://youtu.be/b", title: "B" },
      ],
    } as unknown as DGRelease);
    expect(e.videos?.map((v) => v.title)).toEqual(["A", "B"]);
  });

  it("rolls up per-track credits into tracks", () => {
    const e = toEnrichment("release", {
      id: 1,
      extraartists: [{ id: 5, name: "X", role: "Producer" }],
      tracklist: [
        {
          position: "A1",
          title: "t",
          extraartists: [{ name: "X", role: "Producer" }],
        },
        {
          position: "A2",
          title: "t2",
          extraartists: [{ name: "X", role: "Remix" }],
        },
      ],
    } as unknown as DGRelease);
    const prod = e.credits?.find((c) => c.role === "Producer");
    expect(prod?.tracks).toBe("A1");
    const remix = e.credits?.find((c) => c.role === "Remix");
    expect(remix?.tracks).toBe("A2");
  });

  it("artist: profile stripped + truncated, realName, urls", () => {
    const e = toEnrichment("artist", artistFixture as DGArtist);
    expect(e.profile).toBeDefined();
    expect(e.profile!.length).toBeLessThanOrEqual(601);
    expect(e.profile).not.toMatch(/\[[a-z]+=/i);
    expect(e.realName).toBe(artistFixture.realname);
    expect(e.urls?.length).toBeGreaterThan(0);
  });

  it("label: profile plain text with markup removed", () => {
    const e = toEnrichment("label", labelFixture as DGLabel);
    expect(e.kind).toBe("label");
    expect(e.profile).toBeDefined();
    expect(e.profile).not.toMatch(/\[[a-z]/i);
  });

  it("truncates long profiles at a word boundary with ellipsis", () => {
    const long = "word ".repeat(300).trim();
    const e = toEnrichment("artist", {
      id: 1,
      name: "X",
      profile: long,
    } as unknown as DGArtist);
    expect(e.profile!.endsWith("…")).toBe(true);
    expect(e.profile!.length).toBeLessThanOrEqual(601);
  });

  it("omits absent fields", () => {
    const e = toEnrichment("release", { id: 9 } as DGRelease);
    expect(e.imageUrl).toBeUndefined();
    expect(e.genres).toBeUndefined();
    expect(e.credits).toBeUndefined();
    expect(e.videos).toBeUndefined();
    expect(e.community).toBeUndefined();
    expect(e.url).toBe("https://www.discogs.com/release/9");
  });
});
