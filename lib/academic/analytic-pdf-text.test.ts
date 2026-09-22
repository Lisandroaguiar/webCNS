import { describe, expect, it } from "vitest";
import { analyticPageText } from "./analytic-pdf-text";
import { parseAnalyticDocument } from "./analytic-parser";
const cell = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y] });
describe("PDF visual rows", () => {
  it("reorders columns and preserves wrapped names without duplicate rows", () => {
    const text = analyticPageText([
      cell("Aprobadas", 200, 580), cell("Asignatura", 69, 568), cell("Nota", 340, 568),
      cell("Identidad, Estado y Sociedad en Latinoamérica y", 69, 454.12),
      cell("Argentina", 69, 443.65), cell("17/12/2022", 412, 448.88), cell("8 (Ocho)", 341, 448.88), cell("31844", 502, 448.88),
      cell("Estética", 69, 429.88), cell("15/12/2023", 412, 429.88), cell("9 (Nueve)", 339, 429.88), cell("33736", 502, 429.88)
    ]);
    expect(parseAnalyticDocument(text).subjects).toEqual([
      { rawName: "Identidad, Estado y Sociedad en Latinoamérica y Argentina", grade: 8, passedAt: "2022-12-17", status: "passed" },
      { rawName: "Estética", grade: 9, passedAt: "2023-12-15", status: "passed" }
    ]);
  });
  it("ignores repeated headers and summaries and deduplicates identical rows", () => {
    const result = parseAnalyticDocument("Aprobadas\nEstética 9 (Nueve) 15/12/2023 33736\nPágina 1 de 2\nPlan: 2006\nAsignatura Nota Fecha Acta/Resolución\nEstética 9 (Nueve) 15/12/2023 33736\nTotal de asignaturas aprobadas: 1\nPromedio académico (Sólo asignaturas aprobadas): 9.00\nPorcentaje de avance: Profesor en Diseño Multimedial : 95.70%");
    expect(result.subjects).toHaveLength(1);
    expect(result.reportedApprovedCount).toBe(1);
    expect(result.reportedAverage).toBe(9);
    expect(result.reportedProgress).toBe(95.7);
  });
  it("does not borrow a grade from another subject", () => {
    const result = parseAnalyticDocument("Aprobadas\nMateria incompleta | 15/12/2023\nEstética | 9 | 16/12/2023\nDesaprobadas\nOtra materia | 2 | 17/12/2023");
    expect(result.subjects.map(s => [s.rawName, s.grade, s.status])).toEqual([["Estética", 9, "passed"], ["Otra materia", 2, "pending"]]);
  });
});
