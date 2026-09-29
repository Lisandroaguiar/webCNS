export type DegreeType = "licenciatura" | "profesorado";
export type OrientationCondition = "all" | "not_dibujo";
export type RequirementStatus = "regular" | "passed";
export type PrerequisitePurpose = "enroll" | "pass";

export type Enrollment = {
  id: string;
  programId: string;
  curriculumId: string;
  orientationId: string | null;
  degreeType: DegreeType;
};
export type CurriculumSubject = {
  id: string;
  curriculumId: string;
  subjectId: string;
  officialCode: string | null;
  officialName: string;
  yearLevel: number;
  degreeScope: "both" | DegreeType;
  orientationCondition: OrientationCondition;
  requirementKind: "required" | "choice" | "orientation";
  reviewStatus: "verified" | "manual_review";
};
export type TypedPrerequisite = {
  targetId: string;
  requiredId: string;
  purpose: PrerequisitePurpose;
  requiredStatus: RequirementStatus;
};
export type ChoiceRequirement = {
  id: string;
  curriculumId: string;
  requiredCount: number;
  pool: string;
  excludeEnrollmentOrientation: boolean;
};
export type WorkshopChoice = { subjectId: string; orientationId: string };

export function isComplementaryWorkshopSlot(subject: Pick<CurriculumSubject, "officialName" | "curriculumId">) {
  return subject.curriculumId.startsWith("plastica-") && /^Taller Complementario\b/i.test(subject.officialName);
}

/** A SIU credit named for its workshop orientation cannot be stored in a generic plan slot without losing that orientation. */
export function needsWorkshopOrientationReview(name: string) {
  const plain = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return /^taller complementario\s+(?![ivx]+\b|\d+\b|\()/.test(plain);
}

export function subjectsForEnrollment(subjects: CurriculumSubject[], enrollment: Enrollment) {
  return subjects.filter(subject => subject.curriculumId === enrollment.curriculumId && !isComplementaryWorkshopSlot(subject) &&
    (subject.degreeScope === "both" || subject.degreeScope === enrollment.degreeType) &&
    (subject.orientationCondition === "all" || enrollment.orientationId !== "dibujo"));
}

export function countChoiceRequirement(requirement: ChoiceRequirement, enrollment: Enrollment, choices: WorkshopChoice[]) {
  if (requirement.curriculumId !== enrollment.curriculumId) return 0;
  return new Set(choices.filter(choice => !requirement.excludeEnrollmentOrientation || choice.orientationId !== enrollment.orientationId)
    .map(choice => choice.orientationId)).size;
}

export function meetsPrerequisite(saved: RequirementStatus | "pending" | "in_progress" | undefined, required: RequirementStatus) {
  return saved === "passed" || (required === "regular" && saved === "regular");
}

export function evaluateEnrollmentEligibility(input: {
  enrollment: Enrollment;
  subjects: CurriculumSubject[];
  prerequisites: TypedPrerequisite[];
  history: Record<string, RequirementStatus | "pending" | "in_progress">;
  currentYear: number;
  rollout?: Record<number, number>;
}) {
  const applicable = subjectsForEnrollment(input.subjects, input.enrollment);
  const availableIds = new Set(applicable.map(subject => subject.id));
  return applicable.map(subject => {
    const saved = input.history[subject.id];
    if (saved === "passed") return { subject, status: "completed" as const, missing: [] as TypedPrerequisite[] };
    if (saved === "regular" || saved === "in_progress") return { subject, status: "in_progress" as const, missing: [] as TypedPrerequisite[] };
    if (subject.reviewStatus === "manual_review") return { subject, status: "unknown" as const, reason: "Reglas pendientes de revisión", missing: [] as TypedPrerequisite[] };
    const rolloutYear = input.rollout?.[subject.yearLevel];
    if (rolloutYear && input.currentYear < rolloutYear) return { subject, status: "unknown" as const, reason: "Este año del plan todavía no se implementó", missing: [] as TypedPrerequisite[] };
    const rules = input.prerequisites.filter(rule => rule.targetId === subject.id && rule.purpose === "enroll");
    if (rules.some(rule => !availableIds.has(rule.requiredId))) return { subject, status: "unknown" as const, reason: "Falta una correlativa en este plan", missing: [] as TypedPrerequisite[] };
    const missing = rules.filter(rule => !meetsPrerequisite(input.history[rule.requiredId], rule.requiredStatus));
    return { subject, status: missing.length ? "blocked" as const : "available" as const, missing };
  });
}

export function countKnownProgress(subjects: CurriculumSubject[], enrollment: Enrollment, history: Record<string, RequirementStatus | "pending" | "in_progress">) {
  const required = subjectsForEnrollment(subjects, enrollment).filter(subject => subject.requirementKind !== "choice");
  return { completed: required.filter(subject => history[subject.id] === "passed").length, total: required.length,
    excludesChoices: subjects.some(subject => subject.curriculumId === enrollment.curriculumId && subject.requirementKind === "choice") };
}
