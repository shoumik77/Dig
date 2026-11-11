import { describe, expect, it } from "vitest";
import { parseDiscogsUrl } from "./discogsRef";

describe("parseDiscogsUrl", () => {
  it("parses the four supported kinds", () => {
    expect(parseDiscogsUrl("https://www.discogs.com/release/750726")).toEqual({
      kind: "release",
      id: 750726,
    });
    expect(parseDiscogsUrl("https://www.discogs.com/master/401133")).toEqual({
      kind: "master",
      id: 401133,
    });
    expect(parseDiscogsUrl("https://www.discogs.com/artist/161487")).toEqual({
      kind: "artist",
      id: 161487,
    });
    expect(parseDiscogsUrl("https://www.discogs.com/label/609")).toEqual({
      kind: "label",
      id: 609,
    });
  });

  it("tolerates slug suffixes, http, and missing www", () => {
    expect(
      parseDiscogsUrl("https://www.discogs.com/release/750726-Deep-Inside")
    ).toEqual({ kind: "release", id: 750726 });
    expect(parseDiscogsUrl("http://discogs.com/artist/161487")).toEqual({
      kind: "artist",
      id: 161487,
    });
  });

  it("rejects non-discogs urls and unsupported kinds", () => {
    expect(parseDiscogsUrl("https://example.com/release/1")).toBeNull();
    expect(parseDiscogsUrl("https://www.discogs.com/sell/item/1")).toBeNull();
    expect(parseDiscogsUrl("https://www.discogs.com/forum/1")).toBeNull();
    expect(parseDiscogsUrl("https://www.discogs.com/release/")).toBeNull();
    expect(parseDiscogsUrl("")).toBeNull();
  });
});
