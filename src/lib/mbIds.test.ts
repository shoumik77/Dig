import { describe, expect, it } from "vitest";
import { formatMbId, isValidMbid, mbUrl, parseMbId } from "./mbIds";

const UUID = "29c1256a-d989-4035-a856-95d707e2082c";

describe("mbIds", () => {
  it("validates UUIDs", () => {
    expect(isValidMbid(UUID)).toBe(true);
    expect(isValidMbid(UUID.toUpperCase())).toBe(true);
    expect(isValidMbid("not-a-uuid")).toBe(false);
    expect(isValidMbid("29c1256ad9894035a85695d707e2082c")).toBe(false);
  });

  it("formats and parses mb ids", () => {
    const id = formatMbId("label", UUID.toUpperCase());
    expect(id).toBe(`mb:label:${UUID}`);
    expect(parseMbId(id)).toEqual({ type: "label", mbid: UUID });
    expect(parseMbId(`mb:artist:${UUID}`)?.type).toBe("artist");
    expect(parseMbId(`mb:release:${UUID}`)?.type).toBe("release");
    expect(parseMbId(`mb:release-group:${UUID}`)).toEqual({
      type: "release-group",
      mbid: UUID,
    });
    expect(parseMbId(`mb:recording:${UUID}`)).toEqual({
      type: "recording",
      mbid: UUID,
    });
  });

  it("rejects malformed ids", () => {
    expect(parseMbId("label:strictly-rhythm")).toBeNull();
    expect(parseMbId("mb:track:" + UUID)).toBeNull();
    expect(parseMbId("mb:work:" + UUID)).toBeNull();
    expect(parseMbId("mb:release_group:" + UUID)).toBeNull();
    expect(parseMbId("mb:label:not-a-uuid")).toBeNull();
    expect(parseMbId("mb:label:" + UUID + ":extra")).toBeNull();
    expect(parseMbId("")).toBeNull();
  });

  it("builds entity URLs", () => {
    expect(mbUrl("label", UUID)).toBe(`https://musicbrainz.org/label/${UUID}`);
    expect(mbUrl("release-group", UUID)).toBe(
      `https://musicbrainz.org/release-group/${UUID}`
    );
    expect(mbUrl("recording", UUID)).toBe(
      `https://musicbrainz.org/recording/${UUID}`
    );
  });
});
