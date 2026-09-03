"use client";

import { parseNumber } from "@/lib/bom/parse";
import { catalogue } from "@/lib/catalogue";
import { normaliseUnit, type BomLine, type Totals } from "@/lib/engine";
import { factorValue, tonnes } from "@/lib/format";
import { actions } from "@/lib/store";
import { FactorSelect } from "./FactorSelect";
import { Icon } from "./Icon";
import { ConfidenceBadge, FactorBadges, StatusBadge, Swatch } from "./ui";

function NumberField({ value, label, onChange }: { value: number | null | undefined; label: string; onChange: (value: number | null) => void }) {
  return (
    <input
      key={String(value ?? "")}
      aria-label={label}
      inputMode="decimal"
      className="field field-sm field-quiet num text-right"
      defaultValue={value ?? ""}
      placeholder="–"
      onBlur={(e) => {
        const next = parseNumber(e.target.value);
        if (next !== (value ?? null)) onChange(next);
      }}
    />
  );
}

export function ReviewTable({
  projectId,
  lines,
  totals,
  autoAcceptHigh,
}: {
  projectId: string;
  lines: BomLine[];
  totals: Totals;
  autoAcceptHigh: boolean;
}) {
  const options = { autoAcceptHigh };
  function decide(line: BomLine, status: BomLine["status"]) {
    actions.setStatus(projectId, [line.id], line.status === status ? "pending" : status);
  }

  return (
    <div className="card overflow-x-auto">
      <table className="data-table min-w-[960px]">
        <thead>
          <tr>
            <th className="min-w-[17rem]">Line</th>
            <th className="right w-24">Quantity</th>
            <th className="w-24">Unit</th>
            <th className="right w-24">kg / unit</th>
            <th className="min-w-[19rem]">Factor</th>
            <th className="right w-24">tCO₂e</th>
            <th className="w-40">Decision</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => {
            const factor = line.factorId ? catalogue.byId.get(line.factorId) : undefined;
            const result = totals.results[i];
            return (
              <tr key={line.id} className={line.status === "rejected" ? "opacity-50" : ""}>
                <td>
                  <input
                    key={line.description}
                    aria-label={`Description of ${line.description}`}
                    className="field field-sm field-quiet -ml-2 font-medium"
                    defaultValue={line.description}
                    onBlur={(e) => {
                      if (e.target.value !== line.description) actions.updateLine(projectId, line.id, { description: e.target.value });
                    }}
                  />
                  <div className="mt-1 max-w-[22rem] truncate text-xs text-ink-3" title={line.source.snippet}>
                    {line.section && <span className="text-ink-2">{line.section} · </span>}
                    {line.source.ref}: <span className="font-mono">{line.source.snippet}</span>
                  </div>
                </td>
                <td>
                  <NumberField
                    value={line.quantity}
                    label={`Quantity of ${line.description}`}
                    onChange={(quantity) => actions.updateLine(projectId, line.id, { quantity })}
                  />
                </td>
                <td>
                  <input
                    key={line.unit}
                    aria-label={`Unit of ${line.description}`}
                    aria-invalid={!normaliseUnit(line.unit)}
                    className="field field-sm field-quiet"
                    defaultValue={line.unit}
                    onBlur={(e) => {
                      if (e.target.value !== line.unit) actions.updateLine(projectId, line.id, { unit: e.target.value });
                    }}
                  />
                </td>
                <td>
                  <NumberField
                    value={line.kgPerUnit}
                    label={`kg per unit of ${line.description}`}
                    onChange={(kgPerUnit) => actions.updateLine(projectId, line.id, { kgPerUnit })}
                  />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <Swatch group={factor?.group} />
                    <FactorSelect
                      label={`Factor for ${line.description}`}
                      value={line.factorId}
                      onChange={(factorId) =>
                        actions.updateLine(projectId, line.id, { factorId, confidence: 1, matchReason: "Chosen by the reviewer" })
                      }
                    />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-3">
                    <ConfidenceBadge confidence={line.confidence} />
                    {factor && <FactorBadges factor={factor} />}
                    <span>{line.matchReason}</span>
                    {factor && (
                      <span className="num">
                        · {factorValue(factor.value)} {factor.unit.replace("CO2e", "CO₂e")}
                      </span>
                    )}
                  </div>
                </td>
                <td className="right num font-medium">
                  {result.kgCO2e !== null ? (
                    <span className={result.counted ? "" : "text-ink-3"}>{tonnes(result.kgCO2e)}</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-bad">
                      <Icon name="alert" size={13} />
                      {result.error}
                    </span>
                  )}
                </td>
                <td>
                  <StatusBadge line={line} options={options} />
                  <div className="mt-1.5 flex gap-1">
                    <button
                      className="btn btn-sm"
                      aria-pressed={line.status === "accepted"}
                      aria-label={`Accept ${line.description}`}
                      onClick={() => decide(line, "accepted")}
                    >
                      <Icon name="check" size={14} /> Accept
                    </button>
                    <button
                      className="btn btn-sm btn-icon"
                      aria-pressed={line.status === "rejected"}
                      aria-label={`Reject ${line.description}`}
                      title="Reject"
                      onClick={() => decide(line, "rejected")}
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
