import { extractText, getDocumentProxy } from "unpdf";

/** Text per page, in order. A scanned PDF comes back as empty strings. */
export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: false });
  return text;
}

/** Plain text has no pages, so it is cut into chunks of about one printed page, at line breaks. */
export function textPages(text: string, chunkChars = 3000): string[] {
  const pages: string[] = [];
  for (let start = 0; start < text.length;) {
    let end = Math.min(start + chunkChars, text.length);
    if (end < text.length) {
      const breakAt = text.lastIndexOf("\n", end);
      if (breakAt > start) end = breakAt + 1;
    }
    pages.push(text.slice(start, end));
    start = end;
  }
  return pages;
}
