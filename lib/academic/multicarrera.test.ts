import { describe, expect, it } from "vitest";
import { countChoiceRequirement, countKnownProgress, evaluateEnrollmentEligibility, isComplementaryWorkshopSlot, isNamedWorkshopActivity, linkedWorkshopsBySlot, meetsPrerequisite, needsWorkshopOrientationReview, planSubjectsForEnrollment, subjectsForEnrollment, workshopOptionFitsSlot, type CurriculumSubject, type Enrollment } from "./multicarrera";

const subjects: CurriculumSubject[] = [
  { id: "2006-common", curriculumId: "plastica-2006", subjectId: "lenguaje", officialCode: "H0003", officialName: "Lenguaje Visual I", yearLevel: 1, degreeScope: "both", orientationCondition: "all", requirementKind: "required", reviewStatus: "verified" },
  { id: "2006-lic", curriculumId: "plastica-2006", subjectId: "graduacion", officialCode: "P0049", officialName: "Taller de Trabajo de Graduación", yearLevel: 5, degreeScope: "licenciatura", orientationCondition: "all", requirementKind: "required", reviewStatus: "manual_review" },
  { id: "2006-prof", curriculumId: "plastica-2006", subjectId: "didactica", officialCode: "H0032", officialName: "Didáctica Especial", yearLevel: 5, degreeScope: "profesorado", orientationCondition: "all", requirementKind: "required", reviewStatus: "manual_review" },
  { id: "2006-dibujo-comp", curriculumId: "plastica-2006", subjectId: "dibujo-comp", officialCode: "P0003", officialName: "Dibujo Complementario II", yearLevel: 2, degreeScope: "both", orientationCondition: "not_dibujo", requirementKind: "required", reviewStatus: "manual_review" },
  { id: "2023-common", curriculumId: "plastica-2023", subjectId: "lenguaje", officialCode: "H0003", officialName: "Lenguaje Visual 1", yearLevel: 1, degreeScope: "both", orientationCondition: "all", requirementKind: "required", reviewStatus: "verified" },
];
const enrollment = (orientationId: string, degreeType: Enrollment["degreeType"], curriculumId = "plastica-2006"): Enrollment => ({ id: `${orientationId}-${degreeType}-${curriculumId}`, programId: `plastica-${degreeType}`, curriculumId, orientationId, degreeType });

describe("modelo multicarrera", () => {
  it("aísla planes, títulos y orientación", () => {
    const pinturaLic = subjectsForEnrollment(subjects, enrollment("pintura", "licenciatura"));
    const dibujoProf = subjectsForEnrollment(subjects, enrollment("dibujo", "profesorado"));
    expect(pinturaLic.map(s => s.id)).toEqual(["2006-common", "2006-lic", "2006-dibujo-comp"]);
    expect(dibujoProf.map(s => s.id)).toEqual(["2006-common", "2006-prof"]);
    expect(subjectsForEnrollment(subjects, enrollment("grabado_arte_impreso", "licenciatura", "plastica-2023")).map(s => s.id)).toEqual(["2023-common"]);
    expect(subjectsForEnrollment(subjects, enrollment("escultura", "profesorado", "plastica-2023")).map(s => s.id)).toEqual(["2023-common"]);
  });
  it("cuenta cuatro talleres distintos y excluye la orientación básica", () => {
    const rule = { id: "complementarios", curriculumId: "plastica-2006", requiredCount: 4, pool: "complementary_workshops", excludeEnrollmentOrientation: true };
    const choices = ["grabado_arte_impreso", "ceramica", "escultura", "muralismo_arte_publico_monumental", "pintura"].map((orientationId, index) => ({ subjectId: `t${index}`, orientationId }));
    expect(countChoiceRequirement(rule, enrollment("pintura", "licenciatura"), choices)).toBe(4);
    expect(countChoiceRequirement(rule, enrollment("dibujo", "profesorado"), choices)).toBe(5);
    expect(countChoiceRequirement(rule, enrollment("pintura", "licenciatura"), [...choices, choices[0]])).toBe(4);
    expect(countChoiceRequirement(rule, enrollment("dibujo", "profesorado"), [{ subjectId: "a", orientationId: "pintura" }, { subjectId: "b", orientationId: "pintura" }])).toBe(1);
  });
  it("separa los casilleros genéricos del catálogo de materias cursadas", () => {
    const generic = { ...subjects[0], id: "slot", officialName: "Taller Complementario II", requirementKind: "choice" as const };
    expect(isComplementaryWorkshopSlot(generic)).toBe(true);
    expect(subjectsForEnrollment([...subjects, generic], enrollment("pintura", "licenciatura")).some(row => row.id === "slot")).toBe(false);
    expect(planSubjectsForEnrollment([...subjects, generic], enrollment("pintura", "licenciatura")).some(row => row.id === "slot")).toBe(true);
    expect(countKnownProgress([...subjects, generic], enrollment("pintura", "licenciatura"), { slot: "passed" })).toMatchObject({ completed: 0, total: 3 });
  });
  it("muestra los seis lugares del Plan 2006 en sus años sin contarlos como seis talleres cursados", () => {
    const years = [2, 2, 3, 3, 4, 4];
    const names = ["Taller Complementario I", "Taller Complementario II", "Taller Complementario III", "Taller Complementario IV", "Taller Complementario V (Artes Combinadas)", "Taller Complementario VI (Fotografía e Imagen Digital)"];
    const slots = names.map((officialName, index) => ({ ...subjects[0], id: `slot-${index}`, officialCode: index < 3 ? "P0083" : "P0057", officialName, yearLevel: years[index], requirementKind: "choice" as const }));
    const all = planSubjectsForEnrollment([...subjects, ...slots], enrollment("dibujo", "profesorado"));
    expect(all.filter(isComplementaryWorkshopSlot).map(row => [row.officialName, row.yearLevel])).toEqual(names.map((name, index) => [name, years[index]]));
    expect(new Set(all.filter(isComplementaryWorkshopSlot).map(row => row.id)).size).toBe(6);
    expect(all.filter(row => row.officialCode === "P0083" && isComplementaryWorkshopSlot(row))).toHaveLength(3);
    expect(subjectsForEnrollment([...subjects, ...slots], enrollment("dibujo", "profesorado")).filter(isComplementaryWorkshopSlot)).toEqual([]);
    expect(countKnownProgress([...subjects, ...slots], enrollment("dibujo", "profesorado"), {}).total).toBe(2);
  });
  it("respeta las denominaciones propias del Plan 2023", () => {
    const names = ["Taller Complementario 1", "Taller Complementario 2", "Taller Complementario 3", "Taller Complementario 4", "Taller Complementario (Artes Combinadas)", "Taller Complementario (Fotografía e Imagen Digital)"];
    const slots = names.map((officialName, index) => ({ ...subjects[4], id: `2023-slot-${index}`, officialName, yearLevel: index < 2 ? 2 : index < 4 ? 3 : 4, requirementKind: "choice" as const }));
    expect(planSubjectsForEnrollment([...subjects, ...slots], enrollment("escultura", "profesorado", "plastica-2023")).filter(isComplementaryWorkshopSlot).map(row => row.officialName)).toEqual(names);
  });
  it("no ubica una orientación común en un casillero reservado para otra actividad", () => {
    expect(workshopOptionFitsSlot("Taller Complementario I", "Escenografía")).toBe(true);
    expect(workshopOptionFitsSlot("Taller Complementario V (Artes Combinadas)", "Escenografía")).toBe(false);
    expect(workshopOptionFitsSlot("Taller Complementario V (Artes Combinadas)", "Artes Combinadas", "special")).toBe(true);
    expect(workshopOptionFitsSlot("Taller Complementario I", "Artes Combinadas", "special")).toBe(false);
    expect(workshopOptionFitsSlot("Taller Complementario V (Artes Combinadas)", "Artes Combinadas", "orientation")).toBe(false);
  });
  it("vincula sólo un taller real con opción verificada fuera de la orientación básica", () => {
    const e = enrollment("pintura", "licenciatura");
    const options = [{ id: "grabado", orientation_id: "grabado_arte_impreso", verification_status: "verified" }, { id: "pintura", orientation_id: "pintura", verification_status: "verified" }, { id: "escultura", orientation_id: "escultura", verification_status: "manual_review" }];
    const workshops = [{ raw_name: "Taller de Grabado", curriculum_subject_id: "slot-1", workshop_option_id: "grabado", status: "passed" as const }, { raw_name: "Taller de Pintura", curriculum_subject_id: "slot-2", workshop_option_id: "pintura", status: "passed" as const }, { raw_name: "Taller de Escultura", curriculum_subject_id: "slot-3", workshop_option_id: "escultura", status: "passed" as const }, { raw_name: "Taller sin cotejo", curriculum_subject_id: null, workshop_option_id: null, status: "passed" as const }];
    const linked = linkedWorkshopsBySlot(workshops, options, e);
    expect(linked.get("slot-1")?.raw_name).toBe("Taller de Grabado");
    expect(linked.has("slot-2")).toBe(false);
    expect(linked.has("slot-3")).toBe(false);
    expect(linked.size).toBe(1);
    expect(countChoiceRequirement({ id: "choice", curriculumId: e.curriculumId, requiredCount: 4, pool: "complementary_workshops", excludeEnrollmentOrientation: true }, e, [{ subjectId: "grabado", orientationId: "grabado_arte_impreso" }])).toBe(1);
  });
  it("identifica créditos SIU con orientación que no caben en un casillero genérico", () => {
    expect(needsWorkshopOrientationReview("Taller Complementario Grabado")).toBe(true);
    expect(needsWorkshopOrientationReview("Taller Complementario Escenografía")).toBe(true);
    expect(needsWorkshopOrientationReview("Taller Complementario (Artes Combinadas)")).toBe(false);
    expect(needsWorkshopOrientationReview("Taller Complementario IV")).toBe(false);
    expect(needsWorkshopOrientationReview("Escenografía Complementaria")).toBe(true);
  });
  it("distingue correlativa cursada de aprobada", () => {
    expect(meetsPrerequisite("regular", "regular")).toBe(true);
    expect(meetsPrerequisite("passed", "regular")).toBe(true);
    expect(meetsPrerequisite("regular", "passed")).toBe(false);
    expect(meetsPrerequisite("passed", "passed")).toBe(true);
  });
  it("no declara disponible una materia cuya regla falta o no se puede verificar", () => {
    const e = enrollment("pintura", "licenciatura");
    const result = evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [], history: {}, currentYear: 2026 });
    expect(result.find(row => row.subject.id === "2006-lic")?.status).toBe("unknown");
    const missing = evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [{ targetId: "2006-common", requiredId: "not-present", purpose: "enroll", requiredStatus: "passed" }], history: {}, currentYear: 2026 });
    expect(missing[0].status).toBe("unknown");
  });
  it("respeta la implementación gradual y calcula sólo requisitos conocidos", () => {
    const e = enrollment("escultura", "profesorado", "plastica-2023");
    expect(evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [], history: {}, currentYear: 2023, rollout: { 1: 2024 } })[0].status).toBe("unknown");
    expect(countKnownProgress(subjects, enrollment("pintura", "licenciatura"), { "2006-common": "passed" })).toMatchObject({ completed: 1, total: 3 });
  });
  it("separa disponible, bloqueada por aprobada, bloqueada por cursada y revisión manual", () => {
    const fixtures: CurriculumSubject[] = [
      { ...subjects[0], id: "base" },
      { ...subjects[0], id: "requiere-aprobada", officialName: "Materia con aprobada" },
      { ...subjects[0], id: "requiere-cursada", officialName: "Materia con cursada" },
      { ...subjects[0], id: "pendiente-revision", officialName: "Materia sin reglas verificadas", reviewStatus: "manual_review" },
    ];
    const result = evaluateEnrollmentEligibility({
      enrollment: enrollment("pintura", "licenciatura"), subjects: fixtures,
      prerequisites: [
        { targetId: "requiere-aprobada", requiredId: "base", purpose: "enroll", requiredStatus: "passed" },
        { targetId: "requiere-cursada", requiredId: "base", purpose: "enroll", requiredStatus: "regular" },
      ],
      history: {}, currentYear: 2026,
    });
    expect(Object.fromEntries(result.map(row => [row.subject.id, row.status]))).toEqual({
      base: "available", "requiere-aprobada": "blocked", "requiere-cursada": "blocked", "pendiente-revision": "unknown",
    });
    const withRegular = evaluateEnrollmentEligibility({
      enrollment: enrollment("pintura", "licenciatura"), subjects: fixtures,
      prerequisites: [
        { targetId: "requiere-aprobada", requiredId: "base", purpose: "enroll", requiredStatus: "passed" },
        { targetId: "requiere-cursada", requiredId: "base", purpose: "enroll", requiredStatus: "regular" },
      ],
      history: { base: "regular" }, currentYear: 2026,
    });
    expect(withRegular.find(row => row.subject.id === "requiere-aprobada")?.status).toBe("blocked");
    expect(withRegular.find(row => row.subject.id === "requiere-cursada")?.status).toBe("available");
    const withPassed = evaluateEnrollmentEligibility({
      enrollment: enrollment("pintura", "licenciatura"), subjects: fixtures,
      prerequisites: [
        { targetId: "requiere-aprobada", requiredId: "base", purpose: "enroll", requiredStatus: "passed" },
        { targetId: "requiere-cursada", requiredId: "base", purpose: "enroll", requiredStatus: "regular" },
      ], history: { base: "passed" }, currentYear: 2026,
    });
    expect(withPassed.find(row => row.subject.id === "requiere-aprobada")?.status).toBe("available");
    expect(withPassed.find(row => row.subject.id === "requiere-cursada")?.status).toBe("available");
    expect(countKnownProgress(fixtures, enrollment("pintura", "licenciatura"), { base: "pending" }).completed).toBe(0);
  });
});

it("distingue talleres con orientación de materias obligatorias con nombre Taller", () => {
  expect(isNamedWorkshopActivity("Taller de Pintura")).toBe(true);
  expect(isNamedWorkshopActivity("Taller Complementario Grabado")).toBe(true);
  expect(isNamedWorkshopActivity("Taller de Trabajo de Graduación")).toBe(false);
  expect(isNamedWorkshopActivity("Taller Complementario I")).toBe(false);
  expect(isNamedWorkshopActivity("Escenografía Complementaria")).toBe(true);
});
