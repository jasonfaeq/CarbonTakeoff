import type { CalcOptions, Totals } from "./calc";
import type { Catalogue } from "./catalogue";
import { alternativesFor, computeScenario, switchAll } from "./scenario";
import type { BomLine } from "./types";

export type InsightTone = "info" | "good" | "warn" | "bad";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
  /** A view of the project to go to, relative to /project/[id]. */
  action?: { label: string; href: string };
}

function t(kg: number) {
  return `${(kg / 1000).toLocaleString("en-GB", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} t`;
}

function pct(share: number) {
  return `${Math.round(share * 100)}%`;
}

/**
 * Plain-language observations about a project, most useful first. Every sentence is computed
 * from the same totals the charts use, so nothing here can disagree with the numbers on screen.
 */
export function buildInsights(lines: BomLine[], totals: Totals, catalogue: Catalogue, options: CalcOptions): Insight[] {
  const insights: Insight[] = [];
  const byId = new Map(lines.map((l) => [l.id, l]));

  if (totals.pendingLines > 0) {
    insights.push({
      id: "review",
      tone: "warn",
      title: `${totals.pendingLines} ${totals.pendingLines === 1 ? "line needs" : "lines need"} review`,
      body: "They are not in the total until someone accepts them.",
      action: { label: "Review lines", href: "/lines?filter=open" },
    });
  }

  if (totals.uncountedLines > 0) {
    insights.push({
      id: "uncounted",
      tone: "bad",
      title: `${totals.uncountedLines} accepted ${totals.uncountedLines === 1 ? "line has" : "lines have"} no result`,
      body: "No factor, or a unit that cannot be converted. They count as nothing until fixed, so the total is low by their share.",
      action: { label: "Fix them", href: "/lines?filter=errors" },
    });
  }

  if (totals.kgCO2e <= 0) return insights;

  const [topGroup] = totals.byGroup;
  const [topLine] = totals.ranked;
  if (topGroup && topLine) {
    insights.push({
      id: "top-group",
      tone: "info",
      title: `${topGroup.key} is ${pct(topGroup.kgCO2e / totals.kgCO2e)} of the total`,
      body: `The largest single line is ${byId.get(topLine.lineId)?.description} at ${t(topLine.kgCO2e!)}.`,
    });
  }

  let running = 0;
  let needed = 0;
  for (const r of totals.ranked) {
    running += r.kgCO2e!;
    needed += 1;
    if (running / totals.kgCO2e >= 0.8) break;
  }
  if (totals.ranked.length >= 5 && needed <= Math.ceil(totals.ranked.length / 3)) {
    insights.push({
      id: "pareto",
      tone: "info",
      title: `${needed} of ${totals.ranked.length} lines make up ${pct(running / totals.kgCO2e)}`,
      body: "Check those quantities and factors first: an error there moves the total, an error elsewhere barely does.",
    });
  }

  const scenario = computeScenario(lines, switchAll(lines, catalogue, options), catalogue, options);
  if (scenario.savingsKgCO2e > 0) {
    insights.push({
      id: "savings",
      tone: "good",
      title: `Sourced alternatives could save ${t(scenario.savingsKgCO2e)}`,
      body: `${pct(scenario.savingsPercent / 100)} of the total across ${scenario.lines.length} ${scenario.lines.length === 1 ? "line" : "lines"}, using only lower factors from the same source.`,
      action: { label: "See alternatives", href: "/alternatives" },
    });
  }

  if (topLine && alternativesFor(byId.get(topLine.lineId)!, catalogue).length === 0) {
    insights.push({
      id: "no-alt",
      tone: "info",
      title: "The biggest hotspot has no sourced alternative",
      body: `${byId.get(topLine.lineId)?.description}: the factor set has nothing lower for it. A product EPD from the supplier is the way to improve this number.`,
    });
  }

  const proxyKg = totals.ranked.reduce((s, r) => (catalogue.byId.get(r.factorId!)?.applicability === "proxy" ? s + r.kgCO2e! : s), 0);
  if (proxyKg / totals.kgCO2e >= 0.2) {
    insights.push({
      id: "proxy",
      tone: "warn",
      title: `${pct(proxyKg / totals.kgCO2e)} of the total rests on proxy factors`,
      body: "A proxy is the closest sourced factor, not the product itself. Treat that part of the number as rough.",
      action: { label: "Show proxies", href: "/lines?filter=proxy" },
    });
  }

  return insights;
}
