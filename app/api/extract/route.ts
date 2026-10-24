import { NextResponse, type NextRequest } from "next/server";
import { catalogue } from "@/lib/catalogue";
import { extractedToBomLines } from "@/lib/extract/lines";
import { selectPages } from "@/lib/extract/pages";
import { pdfPages, textPages } from "@/lib/extract/pdf";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/limits";
import { getProvider, liveExtractionAvailable, LlmError } from "@/lib/llm";

export const runtime = "nodejs";
export const maxDuration = 60;

function fail(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ code, message, ...extra }, { status });
}

export async function GET() {
  return NextResponse.json({ live: liveExtractionAvailable(), maxUpload: MAX_UPLOAD_LABEL });
}

export async function POST(request: NextRequest) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "no_file", "No file in the upload.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, "too_large", `The file limit is ${MAX_UPLOAD_LABEL}.`);

  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isText = file.type.startsWith("text/") || /\.(txt|md)$/i.test(file.name);
  if (!isPdf && !isText) return fail(415, "bad_type", "Upload a PDF or a text file.");

  let pages: string[];
  try {
    pages = isPdf ? await pdfPages(new Uint8Array(await file.arrayBuffer())) : textPages(await file.text());
  } catch {
    return fail(422, "unreadable", "This file could not be read as a PDF.");
  }

  const selection = selectPages(pages);
  const counts = { pagesScanned: selection.pagesScanned, pagesSent: selection.selected.length };
  if (selection.selected.length === 0) {
    return fail(422, "no_quantities", "No page looks like it holds material quantities. A scanned PDF has no text to read.", counts);
  }

  const provider = getProvider();
  if (!provider) {
    return fail(503, "no_api_key", "Live extraction needs an API key on the server. The demo specifications work without one.", {
      ...counts,
      pagesSent: 0,
      pagesSelected: selection.selected.length,
    });
  }

  const selected = selection.selected.map((page) => ({ page, text: pages[page - 1] }));
  try {
    const result = await provider.extract({
      pages: selected,
      catalogue: catalogue.factors.map((f) => ({ id: f.id, name: f.name, unit: f.unit })),
    });
    const pageMap = Object.fromEntries(selected.map((p) => [p.page, p.text]));
    const lines = extractedToBomLines(result.lines, pageMap, file.name, isPdf ? "pdf" : "text", catalogue);
    return NextResponse.json({ ...counts, model: result.model, provider: provider.name, lines });
  } catch (error) {
    if (error instanceof LlmError) {
      console.error("extraction failed:", error.message);
      return fail(502, "llm_error", error.userMessage, counts);
    }
    throw error;
  }
}
