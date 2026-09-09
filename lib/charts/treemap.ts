export interface TreemapInput<T> {
  value: number;
  item: T;
}

export interface TreemapTile<T> {
  item: T;
  value: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Sized<T> extends TreemapInput<T> {
  area: number;
}

/** Worst aspect ratio in a row laid along a side of length `side`. Lower is squarer. */
function worst<T>(row: Sized<T>[], side: number): number {
  const sum = row.reduce((s, r) => s + r.area, 0);
  const max = Math.max(...row.map((r) => r.area));
  const min = Math.min(...row.map((r) => r.area));
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

/**
 * Squarified treemap (Bruls, Huizing and van Wijk, 2000). Lays the inputs, largest first, into
 * the rectangle so each tile's area is proportional to its value and tiles stay close to square.
 */
export function squarify<T>(inputs: TreemapInput<T>[], width: number, height: number): TreemapTile<T>[] {
  const positive = inputs.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = positive.reduce((s, i) => s + i.value, 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];
  const scale = (width * height) / total;
  let remaining: Sized<T>[] = positive.map((i) => ({ ...i, area: i.value * scale }));
  const tiles: TreemapTile<T>[] = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;

  while (remaining.length > 0) {
    const side = Math.min(w, h);
    let row = [remaining[0]];
    for (let i = 1; i < remaining.length; i++) {
      const candidate = [...row, remaining[i]];
      if (worst(candidate, side) > worst(row, side)) break;
      row = candidate;
    }
    const rowArea = row.reduce((s, r) => s + r.area, 0);
    if (w >= h) {
      const stripW = rowArea / h;
      let cy = y;
      for (const r of row) {
        const th = r.area / stripW;
        tiles.push({ item: r.item, value: r.value, x, y: cy, w: stripW, h: th });
        cy += th;
      }
      x += stripW;
      w -= stripW;
    } else {
      const stripH = rowArea / w;
      let cx = x;
      for (const r of row) {
        const tw = r.area / stripH;
        tiles.push({ item: r.item, value: r.value, x: cx, y, w: tw, h: stripH });
        cx += tw;
      }
      y += stripH;
      h -= stripH;
    }
    remaining = remaining.slice(row.length);
  }
  return tiles;
}
