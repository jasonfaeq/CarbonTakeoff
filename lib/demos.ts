import type { IconName } from "@/components/Icon";

export interface Demo {
  id: string;
  title: string;
  subtitle: string;
  sector: "Energy" | "Buildings" | "Infrastructure";
  icon: IconName;
  /** A bill of materials is parsed like an upload; a specification loads its cached extraction. */
  kind: "bom" | "spec";
  /** Served from public/, so it can also be downloaded. */
  file: string;
}

/** Synthetic demo projects. Every file says so in its first line or on every page. */
export const DEMOS: Demo[] = [
  {
    id: "wind-foundation",
    title: "Wind turbine foundation",
    subtitle: "Gravity base, cabling and a small substation, with delivery distances",
    sector: "Energy",
    icon: "wind",
    kind: "bom",
    file: "/demo/wind-foundation.csv",
  },
  {
    id: "wind-spec",
    title: "Wind balance-of-plant specification",
    subtitle: "A 6-page PDF with quantities in prose and tables, read by extraction",
    sector: "Energy",
    icon: "file",
    kind: "spec",
    file: "/demo/wind-spec.pdf",
  },
  {
    id: "battery-storage",
    title: "Battery storage, 20 MW / 40 MWh",
    subtitle: "LFP modules, enclosures, inverters and the grid connection",
    sector: "Energy",
    icon: "battery",
    kind: "bom",
    file: "/demo/battery-storage.csv",
  },
  {
    id: "solar-park",
    title: "Solar park, 12 MWp",
    subtitle: "Ramming piles, mounting, cabling, inverter stations",
    sector: "Energy",
    icon: "solar",
    kind: "bom",
    file: "/demo/solar-park.csv",
  },
  {
    id: "residential-concrete",
    title: "Residential block, concrete frame",
    subtitle: "Six storeys, 3,180 m² GIA, brick and block envelope",
    sector: "Buildings",
    icon: "building",
    kind: "bom",
    file: "/demo/residential-concrete.csv",
  },
  {
    id: "residential-timber",
    title: "Residential block, mass timber",
    subtitle: "The same block with a glulam and CLT frame",
    sector: "Buildings",
    icon: "building",
    kind: "bom",
    file: "/demo/residential-timber.csv",
  },
  {
    id: "warehouse",
    title: "Logistics warehouse, 12,000 m²",
    subtitle: "Steel portal frame, fibre-reinforced slab, insulated panels",
    sector: "Buildings",
    icon: "warehouse",
    kind: "bom",
    file: "/demo/warehouse.csv",
  },
  {
    id: "road-reconstruction",
    title: "Rural road reconstruction",
    subtitle: "2.4 km full depth: pavement, drainage, kerbs, barrier",
    sector: "Infrastructure",
    icon: "road",
    kind: "bom",
    file: "/demo/road-reconstruction.csv",
  },
  {
    id: "water-main",
    title: "Water main renewal specification",
    subtitle: "3.2 km of PE pipe in a plain-text spec, read by extraction",
    sector: "Infrastructure",
    icon: "droplet",
    kind: "spec",
    file: "/demo/water-main-spec.txt",
  },
];
