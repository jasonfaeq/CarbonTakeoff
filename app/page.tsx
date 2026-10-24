import { DemoGallery } from "@/components/DemoGallery";
import { NewProject } from "@/components/NewProject";
import { ProjectList } from "@/components/ProjectList";
import { PlaceholderNotice } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pt-10 pb-16 sm:px-6">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-end">
        <div>
          <p className="eyebrow">Embodied-carbon takeoff</p>
          <h1 className="mt-3 max-w-2xl text-[clamp(32px,4.6vw,52px)] leading-[1.05] font-semibold tracking-[-0.03em]">
            From a bill of materials to a sourced carbon number, <span className="text-brand">checked line by line.</span>
          </h1>
        </div>
        <p className="max-w-xl text-[15px] text-ink-2 lg:justify-self-end">
          Upload a BOM, review how every line was matched, and see the total, the hotspots and the lower-carbon alternatives. Every factor shows its
          source. Nothing counts until a person accepts it.
        </p>
      </section>
      <div className="mt-6">
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
