import factorsJson from "@/data/factors.json";
import { buildCatalogue, type Catalogue, type Factor } from "@/lib/engine";

export const catalogue: Catalogue = buildCatalogue(factorsJson.factors as Factor[]);

/** True while data/factors.json still holds the synthetic development values. */
export const usingPlaceholderFactors = catalogue.factors.some((f) => f.status === "PLACEHOLDER");
