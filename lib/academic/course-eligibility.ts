import { subjectsForDegree } from "./degree-catalog";
import { requirements2006 } from "./degree-catalog";
import type { CurriculumValue, DegreeValue } from "./curriculum";

export type EligibilitySubject = { id: string | number; name: string; code: string | null; curriculum: string; year: number | null };
export type EligibilityHistory = { subject_id: string | number; status: string };
export type EligibilityRequirement = { subjectId: string | number; name: string; kind: "regular" | "passed"; satisfied: boolean };
export type CourseEligibility = {
  subject: EligibilitySubject;
  status: "completed" | "in_progress" | "available" | "blocked" | "unknown";
  requirements: EligibilityRequirement[];
  missingRequirements: EligibilityRequirement[];
  requiredBy: string[];
  reason?: string;
  reasonCode?: "unsupported_plan" | "missing_code" | "missing_requirement";
};

/** Plan 2006: regular admite regular o aprobada; passed exige aprobada.
 * Plan 2024: sus alternativas no están representadas en correlatives, por eso
 * ninguna materia pendiente se declara disponible automáticamente.
 */
export function getCourseEligibility(input: {
  subjects: EligibilitySubject[];
  userSubjects: EligibilityHistory[];
  curriculum: CurriculumValue;
  degree: DegreeValue;
}): CourseEligibility[] {
  const subjects = subjectsForDegree(input.subjects.filter(item => item.curriculum === input.curriculum), input.degree, input.curriculum);
  const byCode = new Map(subjects.filter(item => item.code).map(item => [item.code!, item]));
  const statusById = new Map(input.userSubjects.map(item => [String(item.subject_id), item.status]));
  const requiredBy = new Map<string, string[]>();
  if (input.curriculum === "old") {
    for (const subject of subjects) {
      const rule = requirements2006[subject.code ?? ""];
      for (const code of [...(rule?.regular ?? []), ...(rule?.passed ?? [])]) {
        requiredBy.set(code, [...(requiredBy.get(code) ?? []), subject.name]);
      }
    }
  }
  return subjects.map(subject => {
    const base = { subject, requirements: [] as EligibilityRequirement[], missingRequirements: [] as EligibilityRequirement[], requiredBy: requiredBy.get(subject.code ?? "") ?? [] };
    const status = statusById.get(String(subject.id));
    if (status === "passed") return { ...base, status: "completed" as const };
    if (status === "regular") return { ...base, status: "in_progress" as const };
    if (input.curriculum === "new") return { ...base, status: "unknown" as const, reasonCode: "unsupported_plan" as const, reason: "Las reglas alternativas del Plan 2024 todavía no se pueden evaluar automáticamente." };
    if (!subject.code) return { ...base, status: "unknown" as const, reasonCode: "missing_code" as const, reason: "Falta el código de esta materia en el plan." };
    const rule = requirements2006[subject.code];
    const codes = [...(rule?.regular ?? []).map(code => ({ code, kind: "regular" as const })), ...(rule?.passed ?? []).map(code => ({ code, kind: "passed" as const }))];
    const missingSubject = codes.find(item => !byCode.has(item.code));
    if (missingSubject) return { ...base, status: "unknown" as const, reasonCode: "missing_requirement" as const, reason: `No encontramos la correlativa ${missingSubject.code} en este plan.` };
    const requirements = codes.map(({ code, kind }) => {
      const required = byCode.get(code)!;
      const savedStatus = statusById.get(String(required.id));
      return { subjectId: required.id, name: required.name, kind, satisfied: savedStatus === "passed" || (kind === "regular" && savedStatus === "regular") };
    });
    const missingRequirements = requirements.filter(item => !item.satisfied);
    return { ...base, requirements, missingRequirements, status: missingRequirements.length ? "blocked" as const : "available" as const };
  });
}
