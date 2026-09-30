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
  id?: string;
  targetId: string | null;
  targetRequirementId?: string | null;
  requiredId: string | null;
  requirementId?: string | null;
  requiredCode?: string;
  purpose: PrerequisitePurpose;
  requiredStatus: RequirementStatus;
  requiredCount?: number;
  resolutionStatus?: "VERIFIED_BY_CODE" | "CODE_GROUP" | "AMBIGUOUS_CODE" | "MISSING_CODE" | "MANUAL_REVIEW";
};
export type ChoiceRequirement = {
  id: string;
  curriculumId: string;
  requiredCount: number;
  pool: string;
  excludeEnrollmentOrientation: boolean;
};
export type WorkshopChoice = { subjectId: string; orientationId: string };
export type LinkedWorkshop = { curriculum_subject_id: string | null; workshop_option_id: string | null; status: "pending" | "in_progress" | "regular" | "passed" };
export type VerifiedWorkshopOption = { id: string; orientation_id: string; verification_status: string };

export function isComplementaryWorkshopSlot(subject: Pick<CurriculumSubject, "officialName" | "curriculumId">) {
  return subject.curriculumId.startsWith("plastica-") && /^Taller Complementario\b/i.test(subject.officialName);
}

export function workshopOptionFitsSlot(slotName: string, optionName: string) {
  const named = slotName.match(/\(([^)]+)\)/)?.[1];
  return !named || optionName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .includes(named.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());
}

/** A SIU credit named for its workshop orientation cannot be stored in a generic plan slot without losing that orientation. */
export function needsWorkshopOrientationReview(name: string) {
  const plain = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return /^taller complementario\s+(?![ivx]+\b|\d+\b|\()/.test(plain) ||
    /^(?:pintura|grabado(?: y arte impreso)?|escenografia|escultura|ceramica|dibujo|muralismo(?: y arte publico monumental)?) complementari[ao]\b/.test(plain);
}

/** A named workshop is evidence of an activity, not a generic plan slot. */
export function isNamedWorkshopActivity(name: string) {
  const plain = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return /^taller (?:de |complementario\s+)(?:pintura|grabado|escenografia|escultura|ceramica|dibujo|muralismo)(?:\b|\s)/.test(plain) ||
    /^(?:pintura|grabado(?: y arte impreso)?|escenografia|escultura|ceramica|dibujo|muralismo(?: y arte publico monumental)?) complementari[ao]\b/.test(plain);
}

export function planSubjectsForEnrollment(subjects: CurriculumSubject[], enrollment: Enrollment) {
  return subjects.filter(subject => subject.curriculumId === enrollment.curriculumId &&
    (subject.degreeScope === "both" || subject.degreeScope === enrollment.degreeType) &&
    (subject.orientationCondition === "all" || enrollment.orientationId !== "dibujo"));
}

/** Course pickers and eligibility exclude requirement slots; Recorrido keeps the complete plan. */
export function subjectsForEnrollment(subjects: CurriculumSubject[], enrollment: Enrollment) {
  return planSubjectsForEnrollment(subjects, enrollment).filter(subject => !isComplementaryWorkshopSlot(subject));
}

export function countChoiceRequirement(requirement: ChoiceRequirement, enrollment: Enrollment, choices: WorkshopChoice[]) {
  if (requirement.curriculumId !== enrollment.curriculumId) return 0;
  return new Set(choices.filter(choice => !requirement.excludeEnrollmentOrientation || choice.orientationId !== enrollment.orientationId)
    .map(choice => choice.orientationId)).size;
}

export function linkedWorkshopsBySlot<T extends LinkedWorkshop>(workshops: T[], options: VerifiedWorkshopOption[], enrollment: Enrollment) {
  const approvedOptions = new Set(options.filter(option => option.verification_status === "verified" && option.orientation_id !== enrollment.orientationId).map(option => option.id));
  return new Map(workshops.filter(row => row.curriculum_subject_id && row.workshop_option_id && approvedOptions.has(row.workshop_option_id))
    .map(row => [row.curriculum_subject_id as string, row]));
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
  workshopCount?: number;
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
    if (rules.some(rule => rule.resolutionStatus && !["VERIFIED_BY_CODE", "CODE_GROUP"].includes(rule.resolutionStatus)))
      return { subject, status: "unknown" as const, reason: "Hay códigos de correlativas pendientes de revisión", missing: [] as TypedPrerequisite[] };
    if (rules.some(rule => !rule.requirementId && (!rule.requiredId || !availableIds.has(rule.requiredId))))
      return { subject, status: "unknown" as const, reason: "Falta una correlativa en este plan", missing: [] as TypedPrerequisite[] };
    const missing = rules.filter(rule => rule.requirementId
      ? (input.workshopCount ?? 0) < (rule.requiredCount ?? 1)
      : !meetsPrerequisite(input.history[rule.requiredId as string], rule.requiredStatus));
    return { subject, status: missing.length ? "blocked" as const : "available" as const, missing };
  });
}

export function countKnownProgress(subjects: CurriculumSubject[], enrollment: Enrollment, history: Record<string, RequirementStatus | "pending" | "in_progress">) {
  const required = subjectsForEnrollment(subjects, enrollment).filter(subject => subject.requirementKind !== "choice");
  return { completed: required.filter(subject => history[subject.id] === "passed").length, total: required.length,
    excludesChoices: subjects.some(subject => subject.curriculumId === enrollment.curriculumId && subject.requirementKind === "choice") };
}
