import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseAnalyticDocument } from "./analytic-parser";
import { matchAnalyticSubjects } from "./match-analytic-subjects";
import { countChoiceRequirement, isNamedWorkshopActivity } from "./multicarrera";
import { classifyPlasticAnalyticRows, partitionAnalyticReview } from "./analytic-review";

const fixture = readFileSync(new URL("./fixtures/plastica-siu-orientacion-anon.txt", import.meta.url), "utf8");
const parsed = parseAnalyticDocument(fixture);
const catalog = [
  { id: "basic-1", nombre: "Taller Básico 1", requirementKind: "orientation" as const },
  { id: "drawing-comp-1", nombre: "Dibujo Complementario I", requirementKind: "required" as const },
  { id: "art", nombre: "Arte Contemporáneo", requirementKind: "required" as const },
];
const context = { curriculumId: "plastica-2023", orientationId: "muralismo_arte_publico_monumental" };

describe("evidencia SIU anonimizada de Artes Plásticas", () => {
  it("detecta la orientación declarada y conserva nombres, notas, fechas y sección", () => {
    expect(parsed).toMatchObject({ detectedTitle: "licenciatura", detectedPlanYear: 2023, detectedOrientation: context.orientationId });
    expect(parsed.subjects).toEqual([
      { rawName: "Arte Contemporáneo", grade: 7, passedAt: "2024-12-16", status: "passed" },
      { rawName: "Taller Básico Muralismo y Arte Monumental 1", grade: 8, passedAt: "2024-12-18", status: "passed" },
      { rawName: "Dibujo 1", grade: 9, passedAt: "2024-12-20", status: "passed" },
      { rawName: "Escenografía Complementaria", grade: 8, passedAt: "2024-12-22", status: "passed", section: "elective" },
    ]);
    expect(fixture).not.toMatch(/@|DNI|apellido|nombre y apellido/i);
  });

  it("vincula Taller Básico por plan, orientación y tipo de requisito, nunca sólo por parecido", () => {
    const rows = matchAnalyticSubjects(parsed.subjects, catalog, [], context);
    expect(rows[1]).toMatchObject({ rawName: "Taller Básico Muralismo y Arte Monumental 1", kind: "CONTEXT", subjectId: "basic-1", reviewed: true });
    expect(matchAnalyticSubjects([parsed.subjects[1]], catalog, [], { ...context, orientationId: "pintura" })[0].subjectId).toBeUndefined();
    expect(matchAnalyticSubjects([parsed.subjects[1]], [{ ...catalog[0], requirementKind: "required" }], [], context)[0].subjectId).toBeUndefined();
  });

  it("trata el crédito como taller real y no como Complementario I/II ni materia obligatoria", () => {
    const rows = matchAnalyticSubjects(parsed.subjects, catalog, [], context);
    expect(rows[3].subjectId).toBeUndefined();
    expect(isNamedWorkshopActivity(rows[3].rawName)).toBe(true);
    const options = [{ id: "escenografia-comp", orientation_id: "escenografia", academic_name: "Escenografía", siu_name: "Escenografía Complementaria", verification_status: "verified" }];
    const selected = classifyPlasticAnalyticRows(rows, options, context.orientationId);
    const partition = partitionAnalyticReview(selected);
    expect(partition.workshops.map(row => row.rawName)).toEqual(["Escenografía Complementaria"]);
    expect(partition.workshops[0]).toMatchObject({ workshopOptionId: "escenografia-comp", grade: 8, passedAt: "2024-12-22" });
    expect(partition.subjects.map(row => row.rawName)).not.toContain("Escenografía Complementaria");
    expect(classifyPlasticAnalyticRows(rows, [{ ...options[0], orientation_id: context.orientationId }], context.orientationId)[3].workshopOptionId).toBeUndefined();
  });

  it("no confunde Dibujo 1 con Dibujo Complementario I y cuenta opciones por orientation_id", () => {
    const rows = matchAnalyticSubjects(parsed.subjects, catalog, [], context);
    expect(rows[2]).toMatchObject({ kind: "UNMATCHED", reviewed: false });
    expect(rows[2].subjectId).toBeUndefined();
    expect(rows[2].candidateId).toBeUndefined();
    const rule = { id: "complementarios", curriculumId: context.curriculumId, requiredCount: 4, pool: "complementary_workshops", excludeEnrollmentOrientation: true };
    const enrollment = { id: "test", programId: "plastica-lic", curriculumId: context.curriculumId, orientationId: context.orientationId, degreeType: "licenciatura" as const };
    expect(countChoiceRequirement(rule, enrollment, [
      { subjectId: "escenografia", orientationId: "escenografia" },
      { subjectId: "muralismo", orientationId: context.orientationId },
    ])).toBe(1);
  });
});
