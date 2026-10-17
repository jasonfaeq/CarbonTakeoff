import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare, packProject, readProjectFile, ShareError } from "./share";

const project = {
  id: "abc",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-02T00:00:00.000Z",
  name: "Wind foundation",
  document: { file: "wind.csv", provenance: "test" },
  autoAcceptHigh: true,
  scenarios: [{ id: "s1", name: "Low-carbon", switches: { l1: "steel-section-eaf" } }],
  activeScenarioId: "s1",
  premiumPercent: 15,
  comparisonLineIds: null,
  lines: Array.from({ length: 40 }, (_, i) => ({
    id: `csv-${i + 3}`,
    description: `Foundation slab concrete C30/37, pour ${i}`,
    quantity: 10 + i,
    unit: "m3",
    factorId: "concrete-c30-37",
    confidence: 0.9,
    matchReason: "Strength class C30/37 matches the factor",
    status: "pending",
    source: { kind: "csv", file: "wind.csv", ref: `Row ${i + 3}`, snippet: "WTG foundation | concrete" },
  })),
};

describe("share links", () => {
  it("round-trip a project, minus its id and timestamps", async () => {
    const fragment = await encodeShare(project);
    expect(fragment).toMatch(/^[A-Za-z0-9_-]+$/);
    const back = await decodeShare(`#${fragment}`);
    expect(back.name).toBe("Wind foundation");
    expect(back.lines).toHaveLength(40);
    expect(back.scenarios).toEqual(project.scenarios);
    expect(back).not.toHaveProperty("id");
    expect(back).not.toHaveProperty("createdAt");
  });

  it("compress repetitive projects well", async () => {
    const fragment = await encodeShare(project);
    expect(fragment.length).toBeLessThan(JSON.stringify(project).length / 4);
  });

  it("say so when a link is damaged", async () => {
    await expect(decodeShare("not-a-real-link")).rejects.toBeInstanceOf(ShareError);
  });
});

describe("project files", () => {
  it("accept a file made by packProject", () => {
    expect(readProjectFile(JSON.parse(JSON.stringify(packProject(project)))).lines).toHaveLength(40);
  });

  it("refuse other JSON, newer versions and malformed lines", () => {
    expect(() => readProjectFile({ hello: "world" })).toThrow(/not a Carbon Takeoff/);
    expect(() => readProjectFile({ ...packProject(project), version: 99 })).toThrow(/newer version/);
    const broken = packProject({ ...project, lines: [{ id: 1 }] as unknown[] });
    expect(() => readProjectFile(broken)).toThrow(/malformed/);
  });
});
