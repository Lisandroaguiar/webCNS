import { normalizeAcademicSubjectName, type ParsedAnalyticSubject } from "@/lib/academic/analytic-parser";

export type MatchKind = "EXACT" | "ALIAS" | "PROBABLE" | "AMBIGUOUS" | "UNMATCHED";
export type SubjectCandidate = { id: string | number; nombre: string };
export type SubjectAlias = { subject_id: string | number; alias: string; verified: boolean };
export type MatchedAnalyticSubject = ParsedAnalyticSubject & {
  kind: MatchKind;
  subjectId?: string | number;
  candidateId?: string | number;
  candidateIds?: Array<string | number>;
  reviewed?: boolean;
  ignored?: boolean;
};

function score(a: string, b: string) {
  const left = new Set(normalizeAcademicSubjectName(a).split(" "));
  const right = new Set(normalizeAcademicSubjectName(b).split(" "));
  const overlap = Array.from(left).filter(token => right.has(token)).length;
  return overlap / Math.max(left.size, right.size);
}

/** Catalog must already be scoped to the selected career and curriculum. */
export function matchAnalyticSubjects(items: ParsedAnalyticSubject[], catalog: SubjectCandidate[], aliases: SubjectAlias[] = []): MatchedAnalyticSubject[] {
  const catalogIds = new Set(catalog.map(subject => String(subject.id)));
  return items.map(item => {
    const normalized = normalizeAcademicSubjectName(item.rawName);
    const exact = catalog.filter(subject => normalizeAcademicSubjectName(subject.nombre) === normalized);
    if (exact.length === 1) return { ...item, kind: "EXACT" as const, subjectId: exact[0].id, reviewed: true };
    if (exact.length > 1) return { ...item, kind: "AMBIGUOUS" as const, candidateIds: exact.map(subject => subject.id), reviewed: false };
    const aliasIds = Array.from(new Set(aliases.filter(alias => alias.verified && catalogIds.has(String(alias.subject_id)) && normalizeAcademicSubjectName(alias.alias) === normalized).map(alias => String(alias.subject_id))));
    if (aliasIds.length === 1) return { ...item, kind: "ALIAS" as const, subjectId: catalog.find(subject => String(subject.id) === aliasIds[0])!.id, reviewed: true };
    if (aliasIds.length > 1) return { ...item, kind: "AMBIGUOUS" as const, candidateIds: catalog.filter(subject => aliasIds.includes(String(subject.id))).map(subject => subject.id), reviewed: false };
    const ranked = catalog.map(subject => ({ subject, value: score(item.rawName, subject.nombre) })).sort((a, b) => b.value - a.value);
    const best = ranked[0];
    if (!best || best.value < 0.55) return { ...item, kind: "UNMATCHED" as const, reviewed: false };
    const close = ranked.filter(candidate => candidate.value >= 0.55 && best.value - candidate.value < 0.1);
    if (close.length > 1) return { ...item, kind: "AMBIGUOUS" as const, candidateIds: close.map(candidate => candidate.subject.id), reviewed: false };
    return { ...item, kind: "PROBABLE" as const, candidateId: best.subject.id, reviewed: false };
  });
}
