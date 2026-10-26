import type { ReactNode } from "react";
import { usingPlaceholderFactors } from "@/lib/catalogue";
import { confidenceLabel, isCounted, type BomLine, type CalcOptions, type Factor } from "@/lib/engine";
import { groupStyle } from "@/lib/groups";
import { hatchId } from "./Hatch";
import { Icon, type IconName } from "./Icon";

export type Tone = "good" | "warn" | "bad" | "info" | "brand" | "outline" | "neutral";

export function Badge({
  tone = "neutral",
  children,
  title,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={`badge ${className}`} data-tone={tone} title={title}>
      {children}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const label = confidenceLabel(confidence);
  const tone = label === "High" ? "good" : label === "Medium" ? "warn" : "bad";
  return (
    <Badge tone={tone} title={`Match confidence ${Math.round(confidence * 100)}%`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function StatusBadge({ line, options }: { line: BomLine; options: CalcOptions }) {
  if (line.status === "accepted") return <Badge tone="good">Accepted</Badge>;
  if (line.status === "rejected") return <Badge>Rejected</Badge>;
  if (isCounted(line, options)) return <Badge tone="brand">Auto-accepted</Badge>;
  return <Badge tone="warn">Needs review</Badge>;
}

export function FactorBadges({ factor }: { factor: Factor }) {
  return (
    <>
      {factor.status === "PLACEHOLDER" && (
        <Badge tone="outline" title="A synthetic development value, not a sourced factor.">
          Placeholder
        </Badge>
      )}
      {factor.status === "UNVERIFIED" && (
        <Badge tone="bad" title="This value could not be checked against its source.">
          Unverified
        </Badge>
      )}
      {factor.applicability === "proxy" && (
        <Badge tone="warn" title={factor.note ?? "The closest sourced factor, not this exact product."}>
          Proxy
        </Badge>
      )}
    </>
  );
}

/** A material colour with its section hatch. */
export function Swatch({ group, size = 12, className = "" }: { group: string | undefined; size?: number; className?: string }) {
  const { hatch } = groupStyle(group);
  return (
    <svg aria-hidden="true" width={size} height={size} className={`shrink-0 rounded-[3px] ${className}`}>
      <rect width={size} height={size} rx={3} style={{ fill: `url(#${hatchId(hatch)})` }} />
    </svg>
  );
}

export function Kpi({
  label,
  value,
  unit,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  detail?: ReactNode;
  icon?: IconName;
  accent?: boolean;
}) {
  return (
    <div className={`card relative overflow-hidden p-5 ${accent ? "ring-1 ring-brand/30" : ""}`}>
      {accent && <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-brand" />}
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={15} className="text-ink-3" />}
        <span className="eyebrow">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="num text-[34px] leading-none font-semibold tracking-tight">{value}</span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {detail && <div className="mt-2.5 text-[13px] text-ink-2">{detail}</div>}
    </div>
  );
}

export function EmptyState({ icon = "file", title, children, action }: { icon?: IconName; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-ink-3">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="max-w-md text-sm text-ink-2">{children}</p>}
      {action}
    </div>
  );
}

export function SourceLink({ factor }: { factor: Factor }) {
  if (!factor.url) return <span className="text-ink-3">{factor.source}</span>;
  return (
    <a href={factor.url} target="_blank" rel="noreferrer" className="link inline-flex items-center gap-1 text-ink-2 hover:text-ink">
      {factor.source}
      <Icon name="arrow-up-right" size={12} />
    </a>
  );
}

export function PlaceholderNotice() {
  if (!usingPlaceholderFactors) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
      <Icon name="alert" size={16} className="mt-0.5" />
      <span>Placeholder factors. The numbers in this build are synthetic development values, not a real estimate.</span>
    </div>
  );
}

export const SCREENING_NOTE = "Screening-level cradle-to-gate estimate (A1–A3). Not an EN 15978 / ISO 14040/44 LCA.";

export function ScreeningNote({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-[13px] text-ink-3 ${className}`}>
      <Icon name="info" size={14} />
      {SCREENING_NOTE}
    </p>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 32 32" className="logo shrink-0">
      <rect width="32" height="32" rx="9" style={{ fill: "var(--brand)" }} />
      <rect x="8" y="17" width="4" height="7" rx="1.2" style={{ fill: "var(--brand-ink)", opacity: 0.55 }} />
      <rect x="14" y="13" width="4" height="11" rx="1.2" style={{ fill: "var(--brand-ink)", opacity: 0.8 }} />
      <rect x="20" y="8" width="4" height="16" rx="1.2" style={{ fill: "var(--brand-ink)" }} />
    </svg>
  );
}
