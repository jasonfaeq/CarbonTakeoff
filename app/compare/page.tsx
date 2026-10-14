import type { Metadata } from "next";
import { Suspense } from "react";
import { Compare } from "@/components/compare/Compare";

export const metadata: Metadata = { title: "Compare" };

export default function ComparePage() {
  return (
    <Suspense>
      <Compare />
    </Suspense>
  );
}
