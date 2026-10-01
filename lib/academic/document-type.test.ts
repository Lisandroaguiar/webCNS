import { describe, expect, it } from "vitest";
import { parseAnalyticDocument } from "./analytic-parser";

const row = "Aprobadas\nEstética 8 (Ocho) 12/06/2025 12345";

describe("clasificación conservadora del documento académico", () => {
  it("reconoce el analítico con regularizadas por su contenido", () => {
    const parsed = parseAnalyticDocument(`Analítico con regularizadas\nProfesorado en Artes Plásticas\nPlan: 2006\n${row}`);
    expect(parsed.documentType).toBe("ANALYTIC_WITH_REGULARIZED");
    expect(parsed.subjects).toHaveLength(1);
    expect(parsed.detectedPlanYear).toBe(2006);
  });

  it("permite intentar Historia Académica sin alterar las filas", () => {
    const parsed = parseAnalyticDocument(`Historia Académica\nSIU Guaraní\n${row}`);
    expect(parsed.documentType).toBe("ACADEMIC_HISTORY");
    expect(parsed.subjects[0]).toMatchObject({ rawName: "Estética", grade: 8, passedAt: "2025-06-12" });
  });

  it("identifica un documento SIU alternativo con estructura académica", () => {
    const parsed = parseAnalyticDocument(`SIU Guaraní\nConstancia de estudios\n${row}`);
    expect(parsed.documentType).toBe("UNKNOWN_SIU_DOCUMENT");
    expect(parsed.subjects).toHaveLength(1);
  });

  it("no ofrece una importación académica para un PDF ajeno", () => {
    const parsed = parseAnalyticDocument("Catálogo de eventos culturales\nReservas abiertas\nSala principal");
    expect(parsed.documentType).toBe("UNKNOWN_PDF");
    expect(parsed.subjects).toHaveLength(0);
  });

  it("no presume origen SIU por tener una fila con nota y fecha", () => {
    const parsed = parseAnalyticDocument(row);
    expect(parsed.documentType).toBe("UNKNOWN_PDF");
    expect(parsed.subjects).toHaveLength(1);
  });
});
