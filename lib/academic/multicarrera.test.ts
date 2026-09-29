import { describe, expect, it } from "vitest";
import { countChoiceRequirement, countKnownProgress, evaluateEnrollmentEligibility, isComplementaryWorkshopSlot, meetsPrerequisite, needsWorkshopOrientationReview, subjectsForEnrollment, type CurriculumSubject, type Enrollment } from "./multicarrera";

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
  });
  it("identifica créditos SIU con orientación que no caben en un casillero genérico", () => {
    expect(needsWorkshopOrientationReview("Taller Complementario Grabado")).toBe(true);
    expect(needsWorkshopOrientationReview("Taller Complementario Escenografía")).toBe(true);
    expect(needsWorkshopOrientationReview("Taller Complementario (Artes Combinadas)")).toBe(false);
    expect(needsWorkshopOrientationReview("Taller Complementario IV")).toBe(false);
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
