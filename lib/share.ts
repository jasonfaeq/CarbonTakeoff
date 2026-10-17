/**
 * A project packed into a URL fragment: JSON, deflated, base64url. The fragment never reaches a
 * server, so a share link carries the project without anything being uploaded.
 */

export const SHARE_FORMAT = "carbon-takeoff-project";
export const SHARE_VERSION = 1;

/** What travels: the project without its id and timestamps, which the receiver sets. */
export interface SharedProject {
  name: string;
  document: unknown;
  lines: unknown[];
  autoAcceptHigh?: boolean;
  scenarios?: unknown[];
  activeScenarioId?: string | null;
  premiumPercent?: number;
  comparisonLineIds?: string[] | null;
  [key: string]: unknown;
}

export interface ProjectFile {
  format: typeof SHARE_FORMAT;
  version: number;
  exportedAt: string;
  project: SharedProject;
}

export class ShareError extends Error {}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(b64);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Anything shaped like a project: a saved Project, or a plain object in a test. */
export type PackableProject = { name: string; lines: unknown[]; id?: string; createdAt?: string; updatedAt?: string } & object;

export function packProject(project: PackableProject): ProjectFile {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = project;
  void _id;
  void _c;
  void _u;
  return { format: SHARE_FORMAT, version: SHARE_VERSION, exportedAt: new Date().toISOString(), project: rest as SharedProject };
}

/** Check a project file read from a link or an upload. Throws ShareError with a reason a person can act on. */
export function readProjectFile(input: unknown): SharedProject {
  const file = input as Partial<ProjectFile> | null;
  if (!file || typeof file !== "object" || file.format !== SHARE_FORMAT) throw new ShareError("This is not a Carbon Takeoff project file.");
  if (typeof file.version !== "number" || file.version > SHARE_VERSION) throw new ShareError("This project was saved by a newer version of the app.");
  const p = file.project;
  if (!p || typeof p.name !== "string" || !Array.isArray(p.lines)) throw new ShareError("The project file is incomplete.");
  for (const line of p.lines as Record<string, unknown>[]) {
    if (!line || typeof line.id !== "string" || typeof line.description !== "string" || typeof line.unit !== "string") {
      throw new ShareError("A line in the project file is malformed.");
    }
  }
  return p;
}

export async function encodeShare(project: PackableProject): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(packProject(project)));
  return toBase64Url(await pipe(json, new CompressionStream("deflate-raw")));
}

export async function decodeShare(fragment: string): Promise<SharedProject> {
  let parsed: unknown;
  try {
    const bytes = await pipe(fromBase64Url(fragment.replace(/^#/, "")), new DecompressionStream("deflate-raw"));
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ShareError("This link is damaged or incomplete. Ask for it to be sent again.");
  }
  return readProjectFile(parsed);
}
