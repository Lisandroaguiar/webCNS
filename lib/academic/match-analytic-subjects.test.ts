import { describe, expect, it } from "vitest";
import { matchAnalyticSubjects } from "./match-analytic-subjects";
import { normalizeAcademicSubjectName } from "./analytic-parser";

const catalog = [
  { id: 1, nombre: "Tecnología Multimedial III" },
  { id: 2, nombre: "Taller de Diseño Multimedial III" },
  { id: 3, nombre: "Lenguaje Multimedial I" },
];

describe("matching seguro del analítico", () => {
  it("normaliza tildes, NBSP, puntuación y un nivel romano terminal", () => {
    expect(normalizeAcademicSubjectName("  TECNOLOGÍA\u00a0MULTIMEDIAL   III. ")).toBe("tecnologia multimedial 3");
    expect(normalizeAcademicSubjectName("Tecnología Multimedial 3")).toBe("tecnologia multimedial 3");
    expect(normalizeAcademicSubjectName("Arte y cultura")).toBe("arte y cultura");
  });

  it("confirma solo coincidencias EXACT y ALIAS verificado", () => {
    const result = matchAnalyticSubjects(
      [{ rawName: "Tecnologia Multimedial 3" }, { rawName: "Tec Multi 3" }], catalog,
      [{ subject_id: 1, alias: "Tec Multi 3", verified: true }]
    );
    expect(result.map(item => [item.kind, item.subjectId, item.reviewed])).toEqual([["EXACT", 1, true], ["ALIAS", 1, true]]);
  });

  it("un alias no verificado solo puede sugerir; nunca confirmar", () => {
    const result = matchAnalyticSubjects([{ rawName: "Tec Multi 3" }], catalog, [{ subject_id: 1, alias: "Tec Multi 3", verified: false }]);
    expect(result[0].subjectId).toBeUndefined();
    expect(result[0].reviewed).toBe(false);
  });

  it("separa PROBABLE, AMBIGUOUS y UNMATCHED sin aprobarlas", () => {
    const result = matchAnalyticSubjects([
      { rawName: "Tecnología Multimedial" },
      { rawName: "Lenguaje Multimedial" },
      { rawName: "Materia de otra carrera" },
    ], [...catalog, { id: 4, nombre: "Lenguaje Multimedial II" }]);
    expect(result.map(item => item.kind)).toEqual(["PROBABLE", "AMBIGUOUS", "UNMATCHED"]);
    expect(result.every(item => item.subjectId === undefined)).toBe(true);
  });

  it("rechaza aliases de materias fuera del catálogo del plan elegido", () => {
    const result = matchAnalyticSubjects([{ rawName: "Materia del otro plan" }], catalog, [{ subject_id: 99, alias: "Materia del otro plan", verified: true }]);
    expect(result[0].kind).toBe("UNMATCHED");
  });

  it("deja en revisión un nombre exacto duplicado", () => {
    const result = matchAnalyticSubjects([{ rawName: "Lenguaje Multimedial I" }], [...catalog, { id: 4, nombre: "Lenguaje Multimedial 1" }]);
    expect(result[0].kind).toBe("AMBIGUOUS");
    expect(result[0].subjectId).toBeUndefined();
  });
});
