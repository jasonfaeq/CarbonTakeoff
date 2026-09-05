import { catalogue } from "@/lib/catalogue";
import type { Factor } from "@/lib/engine";
import { GROUP_ORDER } from "@/lib/groups";

const groups = Object.entries(
  catalogue.factors.reduce<Record<string, Factor[]>>((acc, f) => {
    (acc[f.group] ??= []).push(f);
    return acc;
  }, {}),
).sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));

export function FactorSelect({
  value,
  onChange,
  label,
  className = "field field-sm",
}: {
  value: string | null;
  onChange: (factorId: string | null) => void;
  label: string;
  className?: string;
}) {
  return (
    <select aria-label={label} className={className} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No factor</option>
      {groups.map(([group, factors]) => (
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
