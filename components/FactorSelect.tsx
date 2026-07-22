import { catalogue } from "@/lib/catalogue";
import type { Factor } from "@/lib/engine";

const groups = catalogue.factors.reduce<Record<string, Factor[]>>((acc, f) => {
  (acc[f.group] ??= []).push(f);
  return acc;
}, {});

export function FactorSelect({
  value,
  onChange,
  label,
  className = "",
}: {
  value: string | null;
  onChange: (factorId: string | null) => void;
  label: string;
  className?: string;
}) {
  return (
    <select aria-label={label} className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No factor</option>
      {Object.entries(groups).map(([group, factors]) => (
        <optgroup key={group} label={group}>
          {factors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
