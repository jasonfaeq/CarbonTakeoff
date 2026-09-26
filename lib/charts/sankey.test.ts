import { describe, expect, it } from "vitest";
import { bandPath, layoutSankey, spreadLabels } from "./sankey";

const links = [
  { source: "Foundation", target: "Concrete", value: 300 },
  { source: "Foundation", target: "Steel", value: 100 },
  { source: "Cabling", target: "Copper", value: 40 },
  { source: "Cabling", target: "Plastics", value: 10 },
  { source: "Substation", target: "Concrete", value: 60 },
  { source: "Substation", target: "Steel", value: 0 },
];

describe("layoutSankey", () => {
  const layout = layoutSankey(links, 300, 10);

  it("puts the largest node at the top of each column", () => {
    expect(layout.left.map((n) => n.id)).toEqual(["Foundation", "Substation", "Cabling"]);
    expect(layout.right.map((n) => n.id)).toEqual(["Concrete", "Steel", "Copper", "Plastics"]);
  });

  it("uses one scale for both columns", () => {
    const leftScale = layout.left[0].h / layout.left[0].value;
    const rightScale = layout.right[0].h / layout.right[0].value;
    expect(leftScale).toBeCloseTo(rightScale);
  });

  it("drops empty links and keeps each band inside its nodes", () => {
    expect(layout.bands).toHaveLength(5);
    for (const b of layout.bands) {
      const s = layout.left.find((n) => n.id === b.source)!;
      const t = layout.right.find((n) => n.id === b.target)!;
      expect(b.sy).toBeGreaterThanOrEqual(s.y - 1e-9);
      expect(b.sy + b.h).toBeLessThanOrEqual(s.y + s.h + 1e-9);
      expect(b.ty).toBeGreaterThanOrEqual(t.y - 1e-9);
      expect(b.ty + b.h).toBeLessThanOrEqual(t.y + t.h + 1e-9);
    }
  });

  it("stays within the height", () => {
    for (const n of [...layout.left, ...layout.right]) {
      expect(n.y).toBeGreaterThanOrEqual(0);
      expect(n.y + n.h).toBeLessThanOrEqual(300 + 1e-9);
    }
  });

  it("draws a closed band", () => {
    const path = bandPath(layout.bands[0], 0, 100);
    expect(path.startsWith("M0 ")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("returns nothing for nothing", () => {
    expect(layoutSankey([], 100)).toEqual({ left: [], right: [], bands: [] });
  });
});

describe("spreadLabels", () => {
  it("pushes crowded labels apart and keeps them inside", () => {
    const ys = spreadLabels([10, 12, 13, 290, 295], 14, 300);
    for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1]).toBeGreaterThanOrEqual(14 - 1e-9);
    expect(ys[ys.length - 1]).toBeLessThanOrEqual(293);
    expect(ys[0]).toBe(10);
  });
});
