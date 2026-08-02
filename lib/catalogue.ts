import factorsJson from "@/data/factors.json";
import spendJson from "@/data/spend-factors.json";
import { buildCatalogue, type Catalogue, type Factor, type SpendData } from "@/lib/engine";

export const catalogue: Catalogue = buildCatalogue(factorsJson.factors as Factor[]);
export const spendData: SpendData = spendJson as SpendData;

/** True while data/factors.json still holds the synthetic development values. */
export const usingPlaceholderFactors = catalogue.factors.some((f) => f.status === "PLACEHOLDER");
