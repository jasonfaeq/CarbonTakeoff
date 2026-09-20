import type { Catalogue } from "./catalogue";

/** At or above this, a pending line can count without a person accepting it. */
export const HIGH_CONFIDENCE = 0.8;

const HIGH = 0.9;
const MEDIUM = 0.6;
const LOW = 0.3;

export interface Match {
  factorId: string | null;
  confidence: number;
  reason: string;
  /** Spend commodity, set only where no activity factor carries one. */
  naics: string | null;
}

interface Rule {
  test: RegExp;
  factorId: string | null;
  confidence: number;
  reason: string;
  naics?: string;
}

const CONCRETE_CLASSES: [number, string][] = [
  [20, "concrete-c20-25"],
  [25, "concrete-c25-30"],
  [30, "concrete-c30-37"],
  [50, "concrete-c50-60"],
];

const RECYCLED = /recycl|\brc[- ]?beton|\brc[- ]concrete/i;

function matchConcrete(text: string): Match | null {
  if (!/concrete|\bbeton\b|transportbeton|\bc\s?\d{2}\s*\/\s*\d{2}\b/i.test(text)) return null;
  const cls = text.match(/\bc\s?(\d{2})\s*\/\s*(\d{2})\b/i);
  if (!cls) {
    return { factorId: "concrete-average", confidence: MEDIUM, reason: "Concrete with no strength class stated: average concrete", naics: null };
  }
  const strength = Number(cls[1]);
  const name = cls[0].replace(/\s/g, "").toUpperCase();
  const exact = CONCRETE_CLASSES.find(([s]) => s === strength);
  // round UP to the next class we have. rounding down underestimates and a screening number should err high
  const chosen = exact ?? CONCRETE_CLASSES.find(([s]) => s >= strength);
  if (!chosen) {
    return { factorId: "concrete-c50-60", confidence: LOW, reason: `${name} is above the highest class (C50/60)`, naics: null };
  }
  const recycled = RECYCLED.test(text) && chosen[0] !== 20;
  const factorId = recycled ? chosen[1].replace("concrete-", "concrete-rc-") : chosen[1];
  return exact
    ? { factorId, confidence: HIGH, reason: `Strength class ${name} matches the factor`, naics: null }
    : { factorId, confidence: MEDIUM, reason: `No factor for ${name}: next class up`, naics: null };
}

/** Lines that mention concrete but are not concrete. */
const NOT_CONCRETE = /rebar|reinforc|bewehr|anchor|\bgrout|bitumen|coating|formwork|epoxy|geotex|concrete blocks?\b|blockwork|block wall|screed/i;

/** First match wins, so the order runs from most specific to most general. English and German. */
const RULES: Rule[] = [
  { test: /switchgear|schaltanlage/i, factorId: null, confidence: LOW, reason: "No factor for switchgear", naics: "335313" },
  { test: /transformer oil|insulating oil|mineral oil/i, factorId: "mineral-oil-primary", confidence: HIGH, reason: "Named as mineral oil" },
  { test: /transformer|\btrafo/i, factorId: "electrical-large", confidence: LOW, reason: "No transformer factor: weak proxy, check this line" },
  { test: /\bgrout|verguss|cement mortar|zementm[oö]rtel/i, factorId: "mortar-cement", confidence: MEDIUM, reason: "Grout: cement mortar proxy" },
  { test: /screed|estrich/i, factorId: "mortar-cement", confidence: MEDIUM, reason: "Screed: cement mortar proxy" },
  { test: /plasterboard|gypsum board|drywall|gipskarton/i, factorId: "plasterboard", confidence: HIGH, reason: "Named as plasterboard" },
  {
    test: /insulation|mineral wool|rock ?wool|glass ?wool|\beps\b|\bxps\b|\bpir\b|d[aä]mmung|d[aä]mmstoff/i,
    factorId: "insulation",
    confidence: MEDIUM,
    reason: "Insulation: average insulation factor, type not distinguished",
  },
  { test: /\bbricks?\b|brickwork|klinker|ziegel/i, factorId: "bricks", confidence: HIGH, reason: "Named as clay brick" },
  {
    test: /concrete blocks?\b|blockwork|block wall|mauerstein|\baac blocks?\b/i,
    factorId: "concrete-blocks",
    confidence: MEDIUM,
    reason: "Concrete blocks: no block factor, average concrete",
  },
  { test: /epoxy|epoxid/i, factorId: "mortar-epoxy", confidence: HIGH, reason: "Named as epoxy mortar" },
  { test: /cem\s?iii/i, factorId: "cement-cem3", confidence: HIGH, reason: "Named as CEM III" },
  { test: /cem\s?ii/i, factorId: "cement-cem2", confidence: HIGH, reason: "Named as CEM II" },
  { test: /\bcement|\bzement/i, factorId: "cement-cem2", confidence: MEDIUM, reason: "Cement type not stated: CEM II" },
  { test: /rebar|reinforc|\bb500|bewehr|betonstahl/i, factorId: "rebar", confidence: HIGH, reason: "Named as reinforcing steel" },
  {
    test: /(eaf|electric arc|lichtbogen).*(steel|stahl)|(steel|stahl).*(eaf|electric arc|lichtbogen)/i,
    factorId: "steel-section-eaf",
    confidence: HIGH,
    reason: "Steel named as electric arc furnace route",
  },
  {
    test: /structural steel|\bs235|\bs275|\bs355|\bs460|anchor cage|steel section|steel support|galvani[sz]ed steel|baustahl|stahlprofil/i,
    factorId: "steel-section-bof",
    confidence: MEDIUM,
    reason: "Structural steel, route not stated: blast furnace route",
  },
  { test: /\bsteel\b|\bstahl\b/i, factorId: "metals-average", confidence: LOW, reason: "Steel product not identified: construction metals average" },
  { test: /copper|kupfer|\bcu\b/i, factorId: "copper-sheet", confidence: MEDIUM, reason: "Copper: metal only, copper sheet as a proxy" },
  {
    test: /alumini?um.*(frame|profile|section|extru|mullion|curtain|rail)|(frame|profile|section|mullion|rail).*alumini?um/i,
    factorId: "aluminium-section",
    confidence: HIGH,
    reason: "Aluminium profile: aluminium section factor",
  },
  { test: /alumini?um|\bal\b/i, factorId: "aluminium-primary", confidence: MEDIUM, reason: "Aluminium: metal only, primary aluminium proxy" },
  { test: /glass|glazing|glazed|\bigu\b|verglasung/i, factorId: "glass", confidence: MEDIUM, reason: "Glazing: general glass factor" },
  { test: /geotex|geovlies|fleece|vlies/i, factorId: "geotextile", confidence: HIGH, reason: "Named as geotextile" },
  { test: /\bpvc\b/i, factorId: "pvc-primary", confidence: HIGH, reason: "Named as PVC" },
  { test: /hdpe|pe-?hd|pe100/i, factorId: "hdpe-primary", confidence: HIGH, reason: "Named as HDPE" },
  {
    test: /ldpe|damp-?proof membrane|\bdpm\b|vapou?r (barrier|control)|polyethylene (sheet|film)|pe-?folie/i,
    factorId: "ldpe-primary",
    confidence: HIGH,
    reason: "Named as polyethylene sheet",
  },
  { test: /polypropylene|\bpp\b/i, factorId: "pp-primary", confidence: HIGH, reason: "Named as polypropylene" },
  {
    test: /recycl\w* asphalt|reclaimed asphalt|asphalt planings|\bplanings\b|\brap\b/i,
    factorId: "asphalt-recycled",
    confidence: HIGH,
    reason: "Named as recycled asphalt",
  },
  { test: /asphalt|bitumin(ous)? (mix|macadam)/i, factorId: "asphalt-primary", confidence: HIGH, reason: "Named as asphalt" },
  { test: /bitumen|bitumin/i, factorId: "bitumen-emulsion", confidence: MEDIUM, reason: "Bitumen coating: emulsion factor" },
  { test: /gravel|\bkies\b/i, factorId: "gravel", confidence: HIGH, reason: "Named as gravel" },
  { test: /\bsand\b/i, factorId: "sand", confidence: HIGH, reason: "Named as sand" },
  { test: /crushed|aggregate|backfill|hardcore|schotter|sub-?base/i, factorId: "aggregates-primary", confidence: HIGH, reason: "Named as aggregate" },
  { test: /timber|formwork|\bwood\b|\bholz\b|schalung/i, factorId: "wood-primary", confidence: HIGH, reason: "Named as timber" },
];

export function matchFactor(description: string): Match {
  const text = description.trim();
  const concrete = matchConcrete(text);
  if (concrete && !NOT_CONCRETE.test(text)) return concrete;
  for (const rule of RULES) {
    if (rule.test.test(text)) return { factorId: rule.factorId, confidence: rule.confidence, reason: rule.reason, naics: rule.naics ?? null };
  }
  return { factorId: null, confidence: 0, reason: "No rule matched: pick a factor or reject this line", naics: null };
}

/** A proxy factor can never be high confidence, whatever matched it. */
export function capConfidence(confidence: number, factorId: string | null, catalogue: Catalogue): number {
  const factor = factorId ? catalogue.byId.get(factorId) : undefined;
  if (factor?.applicability === "proxy") return Math.min(confidence, MEDIUM);
  return confidence;
}

export function confidenceLabel(confidence: number): "High" | "Medium" | "Low" {
  if (confidence >= HIGH_CONFIDENCE) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}
