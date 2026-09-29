import type { MatchedAnalyticSubject } from "./match-analytic-subjects";

export type ReviewRow = MatchedAnalyticSubject & { workshopSelected?: boolean; manualOverride?: boolean };

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
