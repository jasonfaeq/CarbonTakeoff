/** Colour and section hatch for each material group. Colours are CSS variables, so both themes work. */
export interface GroupStyle {
  color: string;
  /** Id of the SVG pattern in <HatchDefs>, and the CSS class for HTML swatches. */
  hatch: string;
}

const GROUPS: Record<string, GroupStyle> = {
  "Concrete & cement": { color: "var(--m-concrete)", hatch: "concrete" },
  Steel: { color: "var(--m-steel)", hatch: "steel" },
  Aluminium: { color: "var(--m-aluminium)", hatch: "aluminium" },
  Copper: { color: "var(--m-copper)", hatch: "copper" },
  Plastics: { color: "var(--m-plastics)", hatch: "plastics" },
  Aggregates: { color: "var(--m-aggregates)", hatch: "aggregates" },
  Timber: { color: "var(--m-timber)", hatch: "timber" },
  Masonry: { color: "var(--m-masonry)", hatch: "masonry" },
  Glass: { color: "var(--m-glass)", hatch: "glass" },
  Insulation: { color: "var(--m-insulation)", hatch: "insulation" },
  Finishes: { color: "var(--m-finishes)", hatch: "finishes" },
  "Electrical equipment": { color: "var(--m-electrical)", hatch: "electrical" },
  "Transport (A4)": { color: "var(--m-transport)", hatch: "transport" },
  Other: { color: "var(--m-other)", hatch: "other" },
};

export function groupStyle(group: string | undefined): GroupStyle {
  return (group && GROUPS[group]) || GROUPS.Other;
}

export const GROUP_ORDER = Object.keys(GROUPS);
