import { normalizeSubjectName, type ParsedAnalyticSubject } from "@/lib/academic/analytic-parser";

export type MatchKind = "EXACT" | "PROBABLE" | "UNMATCHED";
export type SubjectCandidate = { id: string | number; nombre: string };
export type MatchedAnalyticSubject = ParsedAnalyticSubject & {
  kind: MatchKind;
  subjectId?: string | number;
  candidateId?: string | number;
};

function score(a: string, b: string) {
  const left = new Set(normalizeSubjectName(a).split(" "));
  const right = new Set(normalizeSubjectName(b).split(" "));
  const overlap = Array.from(left).filter(token => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

export function matchAnalyticSubjects(items: ParsedAnalyticSubject[], catalog: SubjectCandidate[]): MatchedAnalyticSubject[] {
  return items.map(item => {
    const normalized = normalizeSubjectName(item.rawName);
    const exact = catalog.find(subject => normalizeSubjectName(subject.nombre) === normalized);
    if (exact) return { ...item, kind: "EXACT" as const, subjectId: exact.id };
    const probable = catalog.map(subject => ({ subject, value: score(item.rawName, subject.nombre) })).sort((a, b) => b.value - a.value)[0];
    return probable && probable.value >= 0.55
      ? { ...item, kind: "PROBABLE" as const, candidateId: probable.subject.id }
      : { ...item, kind: "UNMATCHED" as const };
  });
}
