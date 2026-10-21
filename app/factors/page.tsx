import type { Metadata } from "next";
import { FactorLibrary } from "@/components/factors/FactorLibrary";

export const metadata: Metadata = { title: "Factor library" };

export default function FactorsPage() {
  return <FactorLibrary />;
}
