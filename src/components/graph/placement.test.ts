import { describe, expect, it } from "vitest";
import { hashString, ringPositions, type Position } from "./placement";

const center: Position = { x: 500, y: 400 };

function distance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("label:strictly-rhythm")).toBe(
      hashString("label:strictly-rhythm")
    );
    expect(hashString("a")).not.toBe(hashString("b"));
  });
});

describe("ringPositions", () => {
  it("produces deterministic output for identical inputs", () => {
    const opts = { center, count: 6, ring: 0, existing: [] as Position[], seed: "seed" };
    expect(ringPositions(opts)).toEqual(ringPositions(opts));
  });

  it("returns count distinct positions", () => {
    const positions = ringPositions({
      center,
      count: 10,
      ring: 0,
      existing: [],
      seed: "x",
    });
    expect(positions).toHaveLength(10);
    const keys = new Set(positions.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`));
    expect(keys.size).toBe(10);
  });

  it("places ring 1 further out than ring 0", () => {
    const r0 = ringPositions({ center, count: 4, ring: 0, existing: [], seed: "s" });
    const r1 = ringPositions({ center, count: 4, ring: 1, existing: [], seed: "s" });
    for (let i = 0; i < 4; i++) {
      expect(distance(r1[i], center)).toBeGreaterThan(distance(r0[i], center));
    }
  });

  it("nudges a slot that collides with an existing position", () => {
    // compute where a slot would land, then occupy it
    const first = ringPositions({
      center,
      count: 3,
      ring: 0,
      existing: [],
      seed: "collide",
    })[0];
    const withBlocker = ringPositions({
      center,
      count: 3,
      ring: 0,
      existing: [first],
      seed: "collide",
    });
    expect(distance(withBlocker[0], first)).toBeGreaterThanOrEqual(40);
    expect(withBlocker[0]).not.toEqual(first);
    // moved outward along the same angle
    expect(distance(withBlocker[0], center)).toBeGreaterThan(distance(first, center));
  });

  it("returns an empty array for count 0", () => {
    expect(
      ringPositions({ center, count: 0, ring: 0, existing: [], seed: "s" })
    ).toEqual([]);
  });
});
