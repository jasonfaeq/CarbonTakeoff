export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}

export interface SankeyNode {
  id: string;
  value: number;
  /** Top of the node bar, and its height. */
  y: number;
  h: number;
}

export interface SankeyBand extends SankeyLink {
  /** Top of the band where it leaves the source and where it reaches the target, and its thickness. */
  sy: number;
  ty: number;
  h: number;
}

export interface SankeyLayout {
  left: SankeyNode[];
  right: SankeyNode[];
  bands: SankeyBand[];
}

function totals(links: SankeyLink[], key: "source" | "target") {
  const map = new Map<string, number>();
  for (const l of links) map.set(l[key], (map.get(l[key]) ?? 0) + l.value);
  return [...map.entries()].map(([id, value]) => ({ id, value })).sort((a, b) => b.value - a.value);
}

function stack(nodes: { id: string; value: number }[], scale: number, gap: number, height: number): SankeyNode[] {
  const used = nodes.reduce((s, n) => s + n.value * scale, 0) + gap * Math.max(nodes.length - 1, 0);
  let y = Math.max((height - used) / 2, 0);
  return nodes.map((n) => {
    const node = { ...n, y, h: n.value * scale };
    y += node.h + gap;
    return node;
  });
}

/**
 * A two-column flow layout: sources on the left, targets on the right, largest at the top.
 * Both columns share one scale, so a band is equally thick at both ends.
 */
export function layoutSankey(links: SankeyLink[], height: number, gap = 8): SankeyLayout {
  const valid = links.filter((l) => l.value > 0);
  const total = valid.reduce((s, l) => s + l.value, 0);
  if (total <= 0 || height <= 0) return { left: [], right: [], bands: [] };
  const sources = totals(valid, "source");
  const targets = totals(valid, "target");
  const rows = Math.max(sources.length, targets.length);
  const scale = Math.max(height - gap * (rows - 1), 1) / total;
  const left = stack(sources, scale, gap, height);
  const right = stack(targets, scale, gap, height);
  const sourceRank = new Map(left.map((n, i) => [n.id, i]));
  const targetRank = new Map(right.map((n, i) => [n.id, i]));
  const sourceY = new Map(left.map((n) => [n.id, n.y]));
  const targetY = new Map(right.map((n) => [n.id, n.y]));

  // Within a source, bands leave in target order; within a target, they arrive in source order.
  const bySource = [...valid].sort(
    (a, b) => sourceRank.get(a.source)! - sourceRank.get(b.source)! || targetRank.get(a.target)! - targetRank.get(b.target)!,
  );
  const sy = new Map<SankeyLink, number>();
  for (const l of bySource) {
    sy.set(l, sourceY.get(l.source)!);
    sourceY.set(l.source, sourceY.get(l.source)! + l.value * scale);
  }
  const byTarget = [...valid].sort(
    (a, b) => targetRank.get(a.target)! - targetRank.get(b.target)! || sourceRank.get(a.source)! - sourceRank.get(b.source)!,
  );
  const bands: SankeyBand[] = byTarget.map((l) => {
    const band = { ...l, sy: sy.get(l)!, ty: targetY.get(l.target)!, h: l.value * scale };
    targetY.set(l.target, targetY.get(l.target)! + band.h);
    return band;
  });
  return { left, right, bands };
}

/** The outline of one band as an SVG path, curving between the columns. */
export function bandPath(band: SankeyBand, x0: number, x1: number): string {
  const xm = (x0 + x1) / 2;
  return [
    `M${x0} ${band.sy}`,
    `C${xm} ${band.sy} ${xm} ${band.ty} ${x1} ${band.ty}`,
    `L${x1} ${band.ty + band.h}`,
    `C${xm} ${band.ty + band.h} ${xm} ${band.sy + band.h} ${x0} ${band.sy + band.h}`,
    "Z",
  ].join("");
}

/** Label positions for nodes stacked down a column: no two closer than `min`, all inside 0..height. */
export function spreadLabels(centres: number[], min: number, height: number): number[] {
  const out = [...centres];
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + min);
  const overflow = out.length ? out[out.length - 1] - (height - min / 2) : 0;
  if (overflow > 0) {
    out[out.length - 1] -= overflow;
    for (let i = out.length - 2; i >= 0; i--) out[i] = Math.min(out[i], out[i + 1] - min);
  }
  return out;
}
