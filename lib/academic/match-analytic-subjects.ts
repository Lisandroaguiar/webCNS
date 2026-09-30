import { normalizeAcademicSubjectName, type ParsedAnalyticSubject } from "@/lib/academic/analytic-parser";

export type MatchKind = "EXACT" | "ALIAS" | "CONTEXT" | "PROBABLE" | "AMBIGUOUS" | "UNMATCHED";
export type SubjectCandidate = { id: string | number; nombre: string; requirementKind?: "required" | "choice" | "orientation" };
export type SubjectAlias = { subject_id: string | number; alias: string; verified: boolean };
export type MatchContext = { curriculumId: string; orientationId: string | null };
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

const orientationNames: Record<string, string[]> = {
  dibujo: ["dibujo"], pintura: ["pintura"], escenografia: ["escenografia"], escultura: ["escultura"],
  ceramica: ["ceramica"], grabado_arte_impreso: ["grabado y arte impreso", "grabado"],
  muralismo_arte_publico_monumental: ["muralismo y arte publico monumental", "muralismo y arte monumental"],
};

function contextualBasicWorkshop(item: ParsedAnalyticSubject, catalog: SubjectCandidate[], context?: MatchContext) {
  if (!context?.curriculumId.startsWith("plastica-") || !context.orientationId || item.section === "elective") return undefined;
  const match = normalizeAcademicSubjectName(item.rawName).match(/^taller basico (.+) ([1-3])$/);
  if (!match || !orientationNames[context.orientationId]?.includes(match[1])) return undefined;
  const candidates = catalog.filter(subject => subject.requirementKind === "orientation" &&
    normalizeAcademicSubjectName(subject.nombre) === `taller basico ${match[2]}`);
  return candidates.length === 1 ? candidates[0] : undefined;
}

/** Catalog must already be scoped to the selected career and curriculum. */
export function matchAnalyticSubjects(items: ParsedAnalyticSubject[], catalog: SubjectCandidate[], aliases: SubjectAlias[] = [], context?: MatchContext): MatchedAnalyticSubject[] {
  const catalogIds = new Set(catalog.map(subject => String(subject.id)));
  return items.map(item => {
    const normalized = normalizeAcademicSubjectName(item.rawName);
    if (item.section === "elective") return { ...item, kind: "UNMATCHED" as const, reviewed: false };
    const contextual = contextualBasicWorkshop(item, catalog, context);
    if (contextual) return { ...item, kind: "CONTEXT" as const, subjectId: contextual.id, reviewed: true };
    const exact = catalog.filter(subject => normalizeAcademicSubjectName(subject.nombre) === normalized);
    if (exact.length === 1) return { ...item, kind: "EXACT" as const, subjectId: exact[0].id, reviewed: true };
    if (exact.length > 1) return { ...item, kind: "AMBIGUOUS" as const, candidateIds: exact.map(subject => subject.id), reviewed: false };
    const aliasIds = Array.from(new Set(aliases.filter(alias => alias.verified && catalogIds.has(String(alias.subject_id)) && normalizeAcademicSubjectName(alias.alias) === normalized).map(alias => String(alias.subject_id))));
    if (aliasIds.length === 1) return { ...item, kind: "ALIAS" as const, subjectId: catalog.find(subject => String(subject.id) === aliasIds[0])!.id, reviewed: true };
    if (aliasIds.length > 1) return { ...item, kind: "AMBIGUOUS" as const, candidateIds: catalog.filter(subject => aliasIds.includes(String(subject.id))).map(subject => subject.id), reviewed: false };
    const ranked = catalog.filter(subject => !(normalized === "dibujo 1" && normalizeAcademicSubjectName(subject.nombre).startsWith("dibujo complementario")))
      .map(subject => ({ subject, value: score(item.rawName, subject.nombre) })).sort((a, b) => b.value - a.value);
    const best = ranked[0];
    if (!best || best.value < 0.55) return { ...item, kind: "UNMATCHED" as const, reviewed: false };
    const close = ranked.filter(candidate => candidate.value >= 0.55 && best.value - candidate.value < 0.1);
    if (close.length > 1) return { ...item, kind: "AMBIGUOUS" as const, candidateIds: close.map(candidate => candidate.subject.id), reviewed: false };
    return { ...item, kind: "PROBABLE" as const, candidateId: best.subject.id, reviewed: false };
  });
}
