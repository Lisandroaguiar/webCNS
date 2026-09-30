import { planSubjectsForEnrollment, type ChoiceRequirement, type CurriculumSubject, type Enrollment, type PrerequisitePurpose, type RequirementStatus, type TypedPrerequisite } from "./multicarrera";

export type CodeResolutionStatus = "VERIFIED_BY_CODE" | "CODE_GROUP" | "AMBIGUOUS_CODE" | "MISSING_CODE" | "MANUAL_REVIEW";
export type SourceCodePrerequisite = {
  id: string;
  curriculumId: string;
  targetCode: string;
  requiredCode: string;
  purpose: PrerequisitePurpose;
  requiredStatus: RequirementStatus;
  requiredCount: number;
  source: string;
  manualReview?: boolean;
  storedResolutionStatus?: CodeResolutionStatus;
};

function code(value: string) { return value.trim().toUpperCase(); }

/** Resolve only against subjects applicable to this enrollment, never across plans or by name. */
export function resolveCodePrerequisites(input: {
  enrollment: Enrollment;
  subjects: CurriculumSubject[];
  requirements: ChoiceRequirement[];
  rules: SourceCodePrerequisite[];
}): TypedPrerequisite[] {
  const applicable = planSubjectsForEnrollment(input.subjects, input.enrollment);
  const byCode = new Map<string, CurriculumSubject[]>();
  for (const subject of applicable) {
    if (!subject.officialCode) continue;
    const key = code(subject.officialCode);
    byCode.set(key, [...(byCode.get(key) ?? []), subject]);
  }
  const workshopGroup = input.requirements.find(rule => rule.curriculumId === input.enrollment.curriculumId && rule.pool === "complementary_workshops");
  return input.rules.filter(rule => rule.curriculumId === input.enrollment.curriculumId).map(rule => {
    const targetIsGroup = code(rule.targetCode) === "P0083";
    const requiredIsGroup = code(rule.requiredCode) === "P0083";
    const targetGroup = targetIsGroup ? workshopGroup : undefined;
    const requiredGroup = requiredIsGroup ? workshopGroup : undefined;
    const targets = targetIsGroup ? [] : byCode.get(code(rule.targetCode)) ?? [];
    const required = requiredIsGroup ? [] : byCode.get(code(rule.requiredCode)) ?? [];
    let resolutionStatus: CodeResolutionStatus;
    if (rule.manualReview || rule.requiredCount < 1 || (!requiredGroup && rule.requiredCount > 1)) resolutionStatus = "MANUAL_REVIEW";
    else if ((!targetIsGroup && targets.length > 1) || (!requiredIsGroup && required.length > 1)) resolutionStatus = "AMBIGUOUS_CODE";
    else if ((targetIsGroup && !targetGroup) || (requiredIsGroup && !requiredGroup)
      || (!targetIsGroup && targets.length === 0) || (!requiredIsGroup && required.length === 0)) resolutionStatus = "MISSING_CODE";
    else resolutionStatus = targetGroup || requiredGroup ? "CODE_GROUP" : "VERIFIED_BY_CODE";
    // A database-wide duplicate may be unique after degree/orientation scoping.
    // Only an explicit source review must remain unresolved for every enrollment.
    if (rule.storedResolutionStatus === "MANUAL_REVIEW") resolutionStatus = "MANUAL_REVIEW";
    return {
      id: rule.id,
      targetId: targets.length === 1 ? targets[0].id : null,
      targetRequirementId: targetGroup?.id ?? null,
      requiredId: required.length === 1 ? required[0].id : null,
      requirementId: requiredGroup?.id ?? null,
      requiredCode: code(rule.requiredCode),
      purpose: rule.purpose,
      requiredStatus: rule.requiredStatus,
      requiredCount: rule.requiredCount,
      resolutionStatus,
    };
  });
}
