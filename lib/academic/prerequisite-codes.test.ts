import { describe, expect, it } from "vitest";
import { evaluateEnrollmentEligibility, type ChoiceRequirement, type CurriculumSubject, type Enrollment } from "./multicarrera";
import { resolveCodePrerequisites, type SourceCodePrerequisite } from "./prerequisite-codes";

const subject = (id: string, curriculumId: string, officialCode: string, officialName: string, extras: Partial<CurriculumSubject> = {}): CurriculumSubject => ({
  id, curriculumId, subjectId: id, officialCode, officialName, yearLevel: 2, degreeScope: "both", orientationCondition: "all", requirementKind: "required", reviewStatus: "verified", ...extras,
});
const enrollment = (curriculumId: string, orientationId = "pintura", degreeType: Enrollment["degreeType"] = "licenciatura"): Enrollment =>
  ({ id: "test", curriculumId, orientationId, degreeType, programId: "plastica" });
const rule = (curriculumId: string, targetCode: string, requiredCode: string, requiredCount = 1): SourceCodePrerequisite =>
  ({ id: `${curriculumId}-${targetCode}-${requiredCode}`, curriculumId, targetCode, requiredCode, requiredCount, purpose: "enroll", requiredStatus: "passed", source: "PDF oficial" });
const group = (curriculumId: string): ChoiceRequirement => ({ id: `${curriculumId}-four-complementary`, curriculumId, requiredCount: 4, pool: "complementary_workshops", excludeEnrollmentOrientation: true });

describe("correlatividades por código académico", () => {
  it("H0037 requiere H0003 por código aunque cambie el nombre; no confunde un mismo nombre con otro código", () => {
    const e = enrollment("plastica-2023");
    const subjects = [
      subject("target", e.curriculumId, "H0037", "Nombre actualizado"),
      subject("needed", e.curriculumId, "H0003", "Otra denominación oficial"),
      subject("same-name", e.curriculumId, "H9999", "Otra denominación oficial"),
    ];
    const [resolved] = resolveCodePrerequisites({ enrollment: e, subjects, requirements: [], rules: [rule(e.curriculumId, "H0037", "H0003")] });
    expect(resolved).toMatchObject({ targetId: "target", requiredId: "needed", resolutionStatus: "VERIFIED_BY_CODE" });
    expect(evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [resolved], history: { "same-name": "passed" }, currentYear: 2026 })[0].status).toBe("blocked");
    expect(evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [resolved], history: { needed: "passed" }, currentYear: 2026 })[0].status).toBe("available");
  });

  it("no cruza códigos iguales entre los planes 2006 y 2023", () => {
    const subjects = [subject("old-target", "plastica-2006", "H0037", "Lenguaje II"), subject("old-required", "plastica-2006", "H0003", "Lenguaje I"),
      subject("new-target", "plastica-2023", "H0037", "Lenguaje 2"), subject("new-required", "plastica-2023", "H0003", "Lenguaje 1")];
    const rules = [rule("plastica-2006", "H0037", "H0003"), rule("plastica-2023", "H0037", "H0003")];
    expect(resolveCodePrerequisites({ enrollment: enrollment("plastica-2006"), subjects, requirements: [], rules })).toMatchObject([{ targetId: "old-target", requiredId: "old-required" }]);
    expect(resolveCodePrerequisites({ enrollment: enrollment("plastica-2023"), subjects, requirements: [], rules })).toMatchObject([{ targetId: "new-target", requiredId: "new-required" }]);
  });

  it("P0083 es grupo, nunca el primer slot, y tres ocurrencias exigen tres talleres válidos", () => {
    const e = enrollment("plastica-2006");
    const subjects = [subject("target", e.curriculumId, "P0058", "Taller avanzado"),
      subject("slot-one", e.curriculumId, "P0083", "Taller Complementario I", { requirementKind: "choice" }),
      subject("slot-two", e.curriculumId, "P0083", "Taller Complementario II", { requirementKind: "choice" })];
    const [resolved] = resolveCodePrerequisites({ enrollment: e, subjects, requirements: [group(e.curriculumId)], rules: [rule(e.curriculumId, "P0058", "P0083", 3)] });
    expect(resolved).toMatchObject({ requiredId: null, requirementId: group(e.curriculumId).id, requiredCount: 3, resolutionStatus: "CODE_GROUP" });
    expect(evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [resolved], history: {}, workshopCount: 2, currentYear: 2026 })[0].status).toBe("blocked");
    expect(evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: [resolved], history: {}, workshopCount: 3, currentYear: 2026 })[0].status).toBe("available");
  });

  it("marca ambiguo un código duplicado distinto del grupo y faltante uno ausente", () => {
    const e = enrollment("plastica-2006");
    const subjects = [subject("target", e.curriculumId, "H0037", "Lenguaje II"), subject("first", e.curriculumId, "P0003", "Dibujo I"), subject("second", e.curriculumId, "P0003", "Dibujo II")];
    const result = resolveCodePrerequisites({ enrollment: e, subjects, requirements: [group(e.curriculumId)], rules: [rule(e.curriculumId, "H0037", "P0003"), rule(e.curriculumId, "H0037", "H9999")] });
    expect(result.map(item => item.resolutionStatus)).toEqual(["AMBIGUOUS_CODE", "MISSING_CODE"]);
    expect(result[0].requiredId).toBeNull();
    expect(evaluateEnrollmentEligibility({ enrollment: e, subjects, prerequisites: result, history: {}, currentYear: 2026 })[0].status).toBe("unknown");
  });

  it("respeta el alcance de grado y orientación antes de resolver", () => {
    const e = enrollment("plastica-2023", "dibujo", "profesorado");
    const subjects = [subject("target", e.curriculumId, "H0037", "Lenguaje II"),
      subject("teaching", e.curriculumId, "H0003", "Lenguaje I", { degreeScope: "profesorado" }),
      subject("lic", e.curriculumId, "H0003", "Lenguaje I", { degreeScope: "licenciatura" }),
      subject("other-orientation", e.curriculumId, "H0003", "Lenguaje I", { orientationCondition: "not_dibujo" })];
    expect(resolveCodePrerequisites({ enrollment: e, subjects, requirements: [], rules: [rule(e.curriculumId, "H0037", "H0003")] })[0]).toMatchObject({ requiredId: "teaching", resolutionStatus: "VERIFIED_BY_CODE" });
    expect(resolveCodePrerequisites({ enrollment: e, subjects, requirements: [], rules: [{ ...rule(e.curriculumId, "H0037", "H0003"), storedResolutionStatus: "AMBIGUOUS_CODE" }] })[0])
      .toMatchObject({ requiredId: "teaching", resolutionStatus: "VERIFIED_BY_CODE" });
  });
});
