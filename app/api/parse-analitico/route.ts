import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { NextResponse } from "next/server";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { analyticPageText } from "@/lib/academic/analytic-pdf-text";
import { parseAnalyticDocument } from "@/lib/academic/analytic-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
      join(process.cwd(), "node_modules", "pdfjs-dist", "legacy", "build", "pdf.worker.mjs")
    ).toString();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No se recibió ningún PDF." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Por ahora aceptamos únicamente el PDF generado por SIU Guaraní." }, { status: 415 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "El PDF es demasiado grande. Elegí un archivo de hasta 10 MB." }, { status: 413 });
    }

    const data = new Uint8Array(await file.arrayBuffer());
    // En el runtime Node no hay Worker disponible. PDF.js 6 mantiene esta
    // opción en ejecución aunque no la exponga en sus tipos actuales.
    const document = await pdfjsLib.getDocument(
      { data, disableWorker: true } as Parameters<typeof pdfjsLib.getDocument>[0]
    ).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(analyticPageText(content.items.filter((item): item is Extract<typeof item, { str: string }> => "str" in item)));
    }

    const extractedText = pages.join("\n");
    return NextResponse.json({
      ...parseAnalyticDocument(extractedText),
      textPresent: Boolean(extractedText.trim())
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al leer el PDF.";
    return NextResponse.json({ error: `No se pudo extraer el texto del PDF: ${message}` }, { status: 422 });
  }
}

