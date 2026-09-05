"use client";

import { Icon } from "@/components/Icon";
import { useCurrentProject } from "@/components/project/context";
import { ReviewTable } from "@/components/project/ReviewTable";
import { HIGH_CONFIDENCE } from "@/lib/engine";
import { actions } from "@/lib/store";

export default function LinesPage() {
  const { project, totals } = useCurrentProject();
  const { id, lines, autoAcceptHigh } = project;
  const highPending = lines.filter((l) => l.status === "pending" && l.factorId && l.confidence >= HIGH_CONFIDENCE);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[var(--brand)]"
            checked={autoAcceptHigh}
            onChange={(e) => actions.setAutoAccept(id, e.target.checked)}
          />
          Auto-accept high confidence
        </label>
        <button
          className="btn btn-sm ml-auto"
          disabled={highPending.length === 0}
          onClick={() =>
            actions.setStatus(
              id,
              highPending.map((l) => l.id),
              "accepted",
            )
          }
        >
          <Icon name="check" size={14} /> Accept high confidence ({highPending.length})
        </button>
      </div>
      <ReviewTable projectId={id} lines={lines} totals={totals} autoAcceptHigh={autoAcceptHigh} />
    </div>
  );
}
