"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMOS, type Demo } from "@/lib/demos";
import { loadDemo } from "@/lib/load-demo";
import { Icon } from "./Icon";

export function DemoGallery() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function open(demo: Demo) {
    setBusy(demo.id);
    try {
      const id = await loadDemo(demo);
      router.push(`/project/${id}/lines`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {DEMOS.map((demo) => (
        <li key={demo.id} className="card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-ink-2">
              <Icon name={demo.icon} size={19} />
            </span>
            <span className="badge" data-tone="outline">
              {demo.sector}
            </span>
          </div>
          <h3 className="mt-4 font-semibold">{demo.title}</h3>
          <p className="mt-1 flex-1 text-sm text-ink-2">{demo.subtitle}</p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary btn-sm" disabled={busy !== null} onClick={() => open(demo)}>
              {busy === demo.id ? "Opening…" : "Open demo"}
            </button>
            <a className="btn btn-ghost btn-sm" href={demo.file} download>
              <Icon name="download" size={14} /> CSV
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
