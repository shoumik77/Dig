import { describe, expect, it } from "vitest";
import { searchEntities } from "./search";
import { mockMusic } from "@/data/mockMusic";
import { createMockGraphService } from "./graphService";

const service = createMockGraphService(mockMusic);

describe("searchEntities", () => {
  it("matches case-insensitively", () => {
    const results = searchEntities(mockMusic, "STRICTLY");
    expect(results.labels.map((e) => e.id)).toContain("label:strictly-rhythm");
  });

  it("groups results by entity type", () => {
    const results = searchEntities(mockMusic, "s");
    expect(results.labels.every((e) => e.type === "label")).toBe(true);
    expect(results.artists.every((e) => e.type === "artist")).toBe(true);
    expect(results.releases.every((e) => e.type === "release")).toBe(true);
  });

  it("returns empty groups for an empty or whitespace query", () => {
    expect(searchEntities(mockMusic, "")).toEqual({
      labels: [],
      artists: [],
      releases: [],
    });
    expect(searchEntities(mockMusic, "   ")).toEqual({
      labels: [],
      artists: [],
      releases: [],
    });
  });

  it("matches on metadata aliases", () => {
    const results = searchEntities(mockMusic, "maw");
    expect(results.artists.map((e) => e.id)).toContain("artist:masters-at-work");
  });

  it("puts prefix matches before other matches", () => {
    const results = searchEntities(mockMusic, "love");
    const names = results.releases.map((e) => e.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names[0].toLowerCase().startsWith("love")).toBe(true);
  });

  it("is exposed through the graph service", async () => {
    const results = await service.searchEntities("roulé");
    expect(results.labels.map((e) => e.id)).toContain("label:roule");
  });
});
