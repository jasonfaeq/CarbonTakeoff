import type { IconName } from "@/components/Icon";

export interface Demo {
  id: string;
  title: string;
  subtitle: string;
  sector: "Energy" | "Buildings" | "Infrastructure";
  icon: IconName;
  /** Served from public/, so it can also be downloaded. */
  file: string;
}

/** Synthetic demo projects. Every file says so in its first line. */
export const DEMOS: Demo[] = [
  {
    id: "wind-foundation",
    title: "Wind turbine foundation",
    subtitle: "Gravity base, cabling and a small substation",
    sector: "Energy",
    icon: "wind",
    file: "/demo/wind-foundation.csv",
  },
  {
    id: "solar-park",
    title: "Solar park, 12 MWp",
    subtitle: "Ramming piles, mounting, cabling, inverter stations",
    sector: "Energy",
    icon: "solar",
    file: "/demo/solar-park.csv",
  },
  {
    id: "residential-concrete",
    title: "Residential block, concrete frame",
    subtitle: "Six storeys, 3,180 m² GIA, brick and block envelope",
    sector: "Buildings",
    icon: "building",
    file: "/demo/residential-concrete.csv",
  },
  {
    id: "road-reconstruction",
    title: "Rural road reconstruction",
    subtitle: "2.4 km full depth: pavement, drainage, kerbs, barrier",
    sector: "Infrastructure",
    icon: "road",
    file: "/demo/road-reconstruction.csv",
  },
];
