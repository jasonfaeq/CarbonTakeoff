import type { Factor } from "./types";

export interface Catalogue {
  factors: Factor[];
  byId: Map<string, Factor>;
}

export function buildCatalogue(factors: Factor[]): Catalogue {
  return { factors, byId: new Map(factors.map((f) => [f.id, f])) };
}
