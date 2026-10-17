import Papa from "papaparse";
import { catalogue, spendData, transportModes } from "@/lib/catalogue";
import { computeScenario, computeSpendTotals, computeTotals, computeTransport } from "@/lib/engine";
import { packProject } from "@/lib/share";
import { activeScenario, type Project } from "@/lib/store";

/** One row per line, with enough provenance to check any result by hand. */
export function resultsCsv(project: Project): string {
  const options = { autoAcceptHigh: project.autoAcceptHigh };
  const totals = computeTotals(project.lines, catalogue, options);
  const scenario = activeScenario(project);
  const scenarioResult = scenario ? computeScenario(project.lines, scenario.switches, catalogue, options) : null;
  const spend = computeSpendTotals(project.lines, spendData, options);
  const rows = project.lines.map((line, i) => {
    const result = totals.results[i];
    const factor = line.factorId ? catalogue.byId.get(line.factorId) : undefined;
    const alt = scenario?.switches[line.id] ? catalogue.byId.get(scenario.switches[line.id]) : undefined;
    const spendLine = spend.lines.find((s) => s.lineId === line.id);
    const a4 = computeTransport(line, result, transportModes);
    const counted = result.counted && result.kgCO2e !== null;
    return {
      section: line.section ?? "",
      description: line.description,
      quantity: line.quantity ?? "",
      unit: line.unit,
      kg_per_unit: line.kgPerUnit ?? "",
      unit_price_eur: line.unitPriceEur ?? "",
      review_status: line.status,
      counted_in_total: counted ? "yes" : "no",
      error: result.error ?? "",
      confidence: line.confidence,
      match_reason: line.matchReason,
      source_ref: `${line.source.file} ${line.source.ref}`,
      factor_id: factor?.id ?? "",
      factor_name: factor?.name ?? "",
      factor_value: factor?.value ?? "",
      factor_unit: factor?.unit ?? "",
      factor_status: factor?.status ?? "",
      factor_applicability: factor?.applicability ?? "",
      factor_source: factor?.sourceName ?? "",
      factor_table_row: factor?.tableRow ?? "",
      factor_licence: factor?.licence ?? "",
      factor_url: factor?.url ?? "",
      conversion: result.conversion,
      kg_co2e_a1_a3: counted ? Number(result.kgCO2e!.toFixed(1)) : "",
      transport_mode: line.transport?.mode ?? "",
      transport_km: line.transport?.km ?? "",
      kg_co2e_a4: counted && a4.kgCO2e !== null ? Number(a4.kgCO2e.toFixed(1)) : "",
      [`scenario_factor_id${scenario ? ` (${scenario.name})` : ""}`]: alt?.id ?? "",
      scenario_kg_co2e:
        alt && scenarioResult?.scenario.results[i].kgCO2e != null ? Number(scenarioResult.scenario.results[i].kgCO2e!.toFixed(1)) : "",
      spend_naics: spendLine?.factor.naics ?? "",
      spend_based_kg_co2e: spendLine ? Number(spendLine.kgCO2e.toFixed(1)) : "",
    };
  });
  return Papa.unparse(rows);
}

export function projectJson(project: Project): string {
  return JSON.stringify(packProject(project), null, 2);
}

export function fileSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "project"
  );
}

export function downloadText(filename: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
