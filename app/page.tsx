import { NewProject } from "@/components/NewProject";
import { ProjectList } from "@/components/ProjectList";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Carbon Takeoff</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Turn a bill of materials into an embodied-carbon estimate. Every line is matched to a factor with a stated source, and only lines a person
        accepts count towards the total.
      </p>
      <div className="mt-8">
        <NewProject />
      </div>
      <h2 className="mt-10 mb-3 font-medium">Your projects</h2>
      <ProjectList />
      <p className="mt-10 text-xs text-zinc-500">Projects are saved in this browser only.</p>
    </main>
  );
}
