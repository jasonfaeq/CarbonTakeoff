import { describe, expect, it } from "vitest";
import { squarify } from "./treemap";

const inputs = [6, 6, 4, 3, 2, 2, 1].map((value, i) => ({ value, item: `t${i}` }));

describe("squarify", () => {
  const tiles = squarify(inputs, 600, 400);

  it("gives every positive input a tile with an area proportional to its value", () => {
    expect(tiles).toHaveLength(7);
    const total = inputs.reduce((s, i) => s + i.value, 0);
    for (const t of tiles) expect(t.w * t.h).toBeCloseTo((t.value / total) * 600 * 400, 6);
  });

  it("fills the rectangle without leaving it", () => {
    const area = tiles.reduce((s, t) => s + t.w * t.h, 0);
    expect(area).toBeCloseTo(600 * 400, 6);
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(-1e-9);
      expect(t.y).toBeGreaterThanOrEqual(-1e-9);
      expect(t.x + t.w).toBeLessThanOrEqual(600 + 1e-9);
      expect(t.y + t.h).toBeLessThanOrEqual(400 + 1e-9);
    }
  });

  it("keeps tiles reasonably square", () => {
    for (const t of tiles) expect(Math.max(t.w / t.h, t.h / t.w)).toBeLessThan(4);
  });

  it("drops zero and negative values, and handles an empty input", () => {
    expect(
      squarify(
        [
          { value: 0, item: "a" },
          { value: -1, item: "b" },
          { value: 2, item: "c" },
        ],
        10,
        10,
      ),
    ).toHaveLength(1);
    expect(squarify([], 10, 10)).toEqual([]);
  });
});
