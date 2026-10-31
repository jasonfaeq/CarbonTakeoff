"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { parseNumber } from "@/lib/bom/parse";
import { actions } from "@/lib/store";
import { toast } from "@/lib/toast";
import { Icon } from "../Icon";
import { useCurrentProject } from "./context";

const UNIT_SUGGESTIONS = ["m² GIA", "m² GFA", "MW", "MWp", "MWh", "km", "m", "units", "beds", "parking spaces"];

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="card grid gap-5 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-ink-3">{description}</p>
      </div>
      <div className="grid content-start gap-3">{children}</div>
    </section>
  );
}

export function Settings() {
  const { project } = useCurrentProject();
  const router = useRouter();
  const { id } = project;
  const [unitQty, setUnitQty] = useState(project.functionalUnit ? String(project.functionalUnit.quantity) : "");
  const [unit, setUnit] = useState(project.functionalUnit?.unit ?? "");
  const [budget, setBudget] = useState(project.budgetKgCO2e != null ? String(project.budgetKgCO2e / 1000) : "");

  const qty = parseNumber(unitQty);
  const budgetT = parseNumber(budget);
  const unitValid = (qty === null && !unit.trim()) || (qty !== null && qty > 0 && unit.trim().length > 0);

  return (
    <div className="grid max-w-4xl gap-5">
      <Section title="Name" description="Shown in the library, the report and share links.">
        <input
          key={project.name}
          aria-label="Project name"
          className="field"
          defaultValue={project.name}
          onBlur={(e) => {
            const name = e.target.value.trim();
            if (name && name !== project.name) actions.updateSettings(id, { name });
          }}
        />
      </Section>

      <Section
        title="Functional unit"
        description="What the project delivers. The overview divides the total by it, so projects of different sizes can be compared: kg CO₂e per m², per MW, per km."
      >
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <label className="grid gap-1 text-xs text-ink-3">
            Quantity
            <input className="field num" inputMode="decimal" value={unitQty} onChange={(e) => setUnitQty(e.target.value)} placeholder="3180" />
          </label>
          <label className="grid gap-1 text-xs text-ink-3">
            Unit
            <input className="field" list="unit-suggestions" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m² GIA" />
            <datalist id="unit-suggestions">
              {UNIT_SUGGESTIONS.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="btn btn-primary btn-sm"
            disabled={!unitValid}
            onClick={() => {
              actions.updateSettings(id, { functionalUnit: qty !== null ? { quantity: qty, unit: unit.trim() } : null });
              toast("Functional unit saved.", { undoProjectId: id });
            }}
          >
            Save
          </button>
          {!unitValid && <span className="text-xs text-warn">Give both a positive quantity and a unit, or leave both empty.</span>}
        </div>
      </Section>

      <Section
        title="Carbon budget"
        description="An A1–A3 budget in tonnes, if the client or the design team has set one. The overview shows the total and each scenario against it."
      >
        <label className="grid max-w-56 gap-1 text-xs text-ink-3">
          Budget, tCO₂e
          <input className="field num" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="None" />
        </label>
        <div>
          <button
            className="btn btn-primary btn-sm"
            disabled={budget.trim() !== "" && (budgetT === null || budgetT <= 0)}
            onClick={() => {
              actions.updateSettings(id, { budgetKgCO2e: budgetT !== null && budgetT > 0 ? budgetT * 1000 : null });
              toast(budgetT ? "Budget saved." : "Budget removed.", { undoProjectId: id });
            }}
          >
            Save
          </button>
        </div>
      </Section>

      <Section
        title="Auto-accept"
        description="When on, pending lines matched with high confidence count without a click. Off by default for extracted documents."
      >
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--brand)]"
            checked={project.autoAcceptHigh}
            onChange={(e) => actions.updateSettings(id, { autoAcceptHigh: e.target.checked })}
          />
          Count high-confidence matches without review
        </label>
      </Section>

      <Section title="Delete project" description="Removes it from this browser. Export a project file first if you might want it back.">
        <div>
          <button
            className="btn btn-danger"
            onClick={() => {
              if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                actions.deleteProject(id);
                router.push("/");
              }
            }}
          >
            <Icon name="trash" size={15} /> Delete this project
          </button>
        </div>
      </Section>
    </div>
  );
}
