"use client";

import { sheetToTable, type RawTable } from "./parse";

/** Reads the first sheet in the browser. The file never leaves the machine. */
export async function readXlsxTable(file: File): Promise<RawTable> {
  const { readSheet } = await import("read-excel-file/browser");
  const sheet = await readSheet(file);
  return sheetToTable(sheet as unknown[][]);
}
