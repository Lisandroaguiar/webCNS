import { describe, expect, it } from "vitest";
import { partitionAnalyticReview, reviewSummary, type ReviewRow } from "./analytic-review";
import { matchAnalyticSubjects } from "./match-analytic-subjects";

const row = (rawName: string, kind: ReviewRow["kind"], subjectId?: string): ReviewRow => ({ rawName, kind, subjectId });

describe("guardar lo seguro y revisar lo dudoso", () => {
  it("guarda EXACT y ALIAS sin exigir que se resuelvan las demás", () => {
    const rows = [row("Exacta", "EXACT", "a"), row("Alias", "ALIAS", "b"), row("Probable", "PROBABLE"), row("Ambigua", "AMBIGUOUS"), row("Sin match", "UNMATCHED")];
    const result = partitionAnalyticReview(rows);
    expect(result.subjects.map(item => item.rawName)).toEqual(["Exacta", "Alias"]);
    expect(result.pending.map(item => item.rawName)).toEqual(["Probable", "Ambigua", "Sin match"]);
    expect(reviewSummary(rows)).toEqual({ recognized: 2, needConfirmation: 3 });
  });

  it("una fila ignorada permanece recuperable pero no se confirma", () => {
    const result = partitionAnalyticReview([{ ...row("Dudosa", "UNMATCHED"), ignored: true }]);
    expect(result.subjects).toEqual([]);
    expect(result.pending).toHaveLength(1);
    expect(reviewSummary([{ ...row("Dudosa", "UNMATCHED"), ignored: true }]).needConfirmation).toBe(0);
  });

  it("conserva el nombre real del taller sin convertirlo en casillero genérico", () => {
    const result = partitionAnalyticReview([{ ...row("Taller de Pintura", "UNMATCHED"), workshopSelected: true }]);
    expect(result.workshops[0].rawName).toBe("Taller de Pintura");
    expect(result.subjects).toEqual([]);
  });

  it("separa el caso de 10 exactas, 1 alias, 1 ambigua y 1 desconocida", () => {
    const catalog = Array.from({ length: 10 }, (_, index) => ({ id: `s${index}`, nombre: `Materia ${index + 1}` }));
    catalog.push({ id: "alias", nombre: "Epistemología de las Artes" });
    catalog.push({ id: "amb1", nombre: "Lenguaje Visual I" }, { id: "amb2", nombre: "Lenguaje Visual 1" });
    const rows = matchAnalyticSubjects([
      ...Array.from({ length: 10 }, (_, index) => ({ rawName: `Materia ${index + 1}` })),
      { rawName: "Epistemología del Arte" }, { rawName: "Lenguaje Visual I" }, { rawName: "Materia inexistente" },
    ], catalog, [{ subject_id: "alias", alias: "Epistemología del Arte", verified: true }]);
    expect(reviewSummary(rows)).toEqual({ recognized: 11, needConfirmation: 2 });
    expect(rows.slice(-2).map(item => item.kind)).toEqual(["AMBIGUOUS", "UNMATCHED"]);
  });
});
