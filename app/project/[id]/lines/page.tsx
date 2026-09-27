"use client";

import { Suspense } from "react";
import { LinesTable } from "@/components/project/LinesTable";

export default function LinesPage() {
  return (
    <Suspense>
      <LinesTable />
    </Suspense>
  );
}
