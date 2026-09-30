import type { MatchedAnalyticSubject } from "./match-analytic-subjects";
import { normalizeAcademicSubjectName } from "./analytic-parser";
import { isNamedWorkshopActivity } from "./multicarrera";

export type ReviewRow = MatchedAnalyticSubject & { workshopSelected?: boolean; workshopOptionId?: string; manualOverride?: boolean };

type VerifiedWorkshop = { id: string; orientation_id: string; academic_name: string; siu_name: string | null; verification_status: string };

/** SIU elective workshops keep their real title; only a verified, non-basic option counts. */
export function classifyPlasticAnalyticRows(rows: MatchedAnalyticSubject[], options: VerifiedWorkshop[], basicOrientationId: string | null): ReviewRow[] {
  return rows.map(row => {
    if (row.section !== "elective" || !isNamedWorkshopActivity(row.rawName)) return row;
    const option = options.find(item => item.verification_status === "verified" && item.orientation_id !== basicOrientationId &&
      [item.siu_name, item.academic_name].some(name => name && normalizeAcademicSubjectName(name) === normalizeAcademicSubjectName(row.rawName)));
    return { ...row, workshopSelected: true, workshopOptionId: option?.id, reviewed: true };
  });
}

/** Only exact matches, verified aliases and explicit student choices enter history. */
export function partitionAnalyticReview(rows: ReviewRow[]) {
  return {
    subjects: rows.filter(row => row.subjectId != null && !row.ignored),
    workshops: rows.filter(row => row.workshopSelected && !row.ignored),
    pending: rows.filter(row => row.subjectId == null && !row.workshopSelected),
  };
}

export function reviewSummary(rows: ReviewRow[]) {
  const { subjects, pending } = partitionAnalyticReview(rows);
  return { recognized: subjects.length, needConfirmation: pending.filter(row => !row.ignored).length };
}
