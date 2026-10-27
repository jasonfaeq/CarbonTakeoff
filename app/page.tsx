import { DemoGallery } from "@/components/DemoGallery";
import { Icon, type IconName } from "@/components/Icon";
import { NewProject } from "@/components/NewProject";
import { ProjectList } from "@/components/ProjectList";
import { SectionDrawing } from "@/components/SectionDrawing";
import { PlaceholderNotice } from "@/components/ui";

const RULES: { icon: IconName; text: string }[] = [
  { icon: "link", text: "A source on every factor" },
  { icon: "check", text: "Nothing counts until accepted" },
  { icon: "alert", text: "Gaps are errors, not guesses" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-16 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
        <div className="rise">
          <p className="eyebrow eyebrow-mark">Embodied-carbon takeoff</p>
          <h1 className="mt-4 max-w-2xl text-[clamp(32px,4.6vw,52px)] leading-[1.05] font-semibold tracking-[-0.03em]">
            From a bill of materials to a sourced carbon number,{" "}
            <span className="relative whitespace-nowrap text-brand">
              checked line by line.
              <svg aria-hidden="true" viewBox="0 0 300 12" preserveAspectRatio="none" className="absolute -bottom-2 left-0 h-3 w-full">
                <path d="M3 8c60-6 140-7 294-3" className="draw-in fill-none stroke-highlight" strokeWidth={5} strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-[15px] text-ink-2">
            Upload a BOM, review how every line was matched, and see the total, the hotspots and the lower-carbon alternatives. Every factor shows its
            source. Nothing counts until a person accepts it.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {RULES.map((r) => (
              <li key={r.text} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3 py-1 text-[13px] text-ink-2">
                <Icon name={r.icon} size={13} className="text-brand" />
                {r.text}
              </li>
            ))}
          </ul>
        </div>
        <figure className="drafting card relative overflow-hidden px-4 pt-2 pb-4 sm:px-6">
          <SectionDrawing />
          <figcaption className="relative text-[12.5px] text-ink-3">
            Each material keeps its section hatch, as on a drawing, through every chart and table.
          </figcaption>
        </figure>
      </section>
      <div className="mt-8">
        <PlaceholderNotice />
      </div>
      <div className="mt-6">
        <NewProject />
      </div>
      <section id="demos" className="mt-12 scroll-mt-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Demo projects</h2>
          <span className="text-xs text-ink-3">Synthetic data</span>
        </div>
        <DemoGallery />
      </section>
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Your projects</h2>
          <span className="text-xs text-ink-3">Saved in this browser only</span>
        </div>
        <ProjectList />
      </section>
    </main>
  );
}
