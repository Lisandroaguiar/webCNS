import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { sourceRegistry } from "@/lib/fda/source-registry";
import { fetchSource } from "@/lib/fda/fetch-source";
import { parseAcademicCalendarText } from "@/lib/fda/parsers/academic-calendar-pdf";
import type { ImportResult } from "@/lib/fda/types";

async function extractPdfText(buffer: Buffer) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")).toString();
  const document = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true } as Parameters<typeof pdfjsLib.getDocument>[0]).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => "str" in item ? item.str : "").join("\n"));
  }
  return pages.join("\n");
}

export async function runSourceImport(sourceKey: string): Promise<ImportResult> {
  const source = sourceRegistry[sourceKey];
  if (!source) throw new Error("Fuente no permitida.");
  const fetched = await fetchSource(source.resourceUrl);
  const text = await extractPdfText(fetched.buffer);
  const parsed = parseAcademicCalendarText(text, { sourceUrl: source.resourceUrl, sourceLabel: source.sourceLabel, semester: source.semester });
  return { schedules: [], events: parsed.events, warnings: parsed.warnings, checksum: createHash("sha256").update(text).digest("hex") };
}
