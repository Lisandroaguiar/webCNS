import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { sourceRegistry } from "@/lib/fda/source-registry";
import { fetchSource } from "@/lib/fda/fetch-source";
import { parseGoogleSheetGrid } from "@/lib/fda/parsers/google-sheet-schedule";
import { parseSaeMultimedia } from "@/lib/fda/parsers/sae-multimedia";
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
  if (source.parserKey === "sae-multimedia-annual-first" || source.parserKey === "sae-multimedia-second") {
    const parsed = parseSaeMultimedia(fetched.buffer.toString("utf8"), source.parserKey === "sae-multimedia-second" ? "second" : "annual-first", {
      sourceUrl: source.indexUrl,
      sourceLabel: source.sourceLabel,
      academicYear: 2026
    });
    return { schedules: parsed.schedules, events: [], warnings: parsed.warnings, checksum: fetched.checksum };
  }
  if (source.parserKey === "sae-schedules") {
    const html = fetched.buffer.toString("utf8");
    const links = Array.from(html.matchAll(/href=["']([^"']+)["']/gi)).map(match => match[1]).filter(link => /docs\.google\.com|\.csv|\.xlsx/i.test(link));
    if (!links.length) return { schedules: [], events: [], warnings: ["No encontramos una planilla pública enlazada desde SAE."], checksum: fetched.checksum };
    const candidate = new URL(links[0], source.indexUrl).toString();
    const sheetUrl = candidate.includes("docs.google.com/spreadsheets") && !candidate.includes("export=")
      ? candidate.replace(/\/edit.*$/, "/export?format=csv")
      : candidate;
    const sheet = await fetchSource(sheetUrl);
    return {
      schedules: parseGoogleSheetGrid(sheet.buffer.toString("utf8"), { sourceUrl: sheetUrl, sourceLabel: source.sourceLabel, academicYear: new Date().getFullYear() }),
      events: [],
      warnings: links.length > 1 ? ["Se detectaron varias planillas SAE; se importó la primera para revisión humana."] : [],
      checksum: sheet.checksum
    };
  }
  if (source.parserKey === "google-sheet-grid") {
    const schedules = parseGoogleSheetGrid(fetched.buffer.toString("utf8"), { sourceUrl: source.resourceUrl, sourceLabel: source.sourceLabel, curriculum: source.curriculum, semester: source.semester, academicYear: new Date().getFullYear() });
    if (sourceKey === "multimedia-schedules-old") for (const item of schedules) {
      if (/^lenguaje\s+visual\s+(?:1|i)$/i.test(item.rawSubjectName.trim())) item.curriculum = "new";
      // La planilla SAE confirma que este teórico del jueves sólo se dicta en el primer cuatrimestre.
      if (/^tecnolog[ií]a\s+multimedial\s+(?:1|i)$/i.test(item.rawSubjectName.trim()) && item.weekday === "Jueves" && item.startTime === "20:00") item.semester = 1;
    }
    return {
      schedules,
      events: [],
      warnings: [],
      checksum: fetched.checksum
    };
  }
  const text = await extractPdfText(fetched.buffer);
  const parsed = parseAcademicCalendarText(text, { sourceUrl: source.resourceUrl, sourceLabel: source.sourceLabel, semester: source.semester });
  return { schedules: [], events: parsed.events, warnings: parsed.warnings, checksum: createHash("sha256").update(text).digest("hex") };
}
