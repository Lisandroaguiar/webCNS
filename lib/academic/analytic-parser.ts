import { detectCurriculum, detectDegree, type CurriculumValue, type DegreeValue } from "@/lib/academic/curriculum";

export type ParsedAnalyticSubject = { rawName: string; grade?: number; passedAt?: string; status?: "passed" | "regular" | "pending" };
export type ParsedAnalytic = {
  detectedDegree?: DegreeValue; detectedCurriculum?: CurriculumValue;
  subjects: ParsedAnalyticSubject[]; reportedApprovedCount?: number;
  reportedAverage?: number; reportedProgress?: number; warnings: string[];
};
export function normalizeSubjectName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
function metadataNumber(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match ? Number(match[1].replace(",", ".")) : undefined;
}
export function parseAnalyticDocument(text: string): ParsedAnalytic {
  const subjects: ParsedAnalyticSubject[] = [];
  const warnings: string[] = [];
  let pending = "";
  let section: ParsedAnalyticSubject["status"];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (/^(?:asignaturas\s+)?(?:no aprobadas|desaprobadas|pendientes)\s*:?$/i.test(line)) { section = "pending"; pending = ""; continue; }
    if (/^(?:asignaturas\s+)?aprobadas\s*:?$/i.test(line)) { section = "passed"; pending = ""; continue; }
    if (/^(?:asignaturas\s+)?regularizadas\s*:?$/i.test(line)) { section = "regular"; pending = ""; continue; }
    // Headers, footers and summaries must never become part of a subject.
    if (/^(?:asignatura\b|materia\b|nota\b|fecha\b|acta\b|página\b|pagina\b|total\b|promedio\b|porcentaje\b|observaciones\b|facultad\b|universidad\b|profesorado\b|licenciatura\b|reporte\b|apellido\b|dni\b|plan\b|estado\b|otro tipo\b|lugar\b|código\b|no cotejado\b|https?:)/i.test(line)) { pending = ""; continue; }
    const value = (pending ? `${pending} ${line}` : line).replace(/\s*\|\s*/g, " ");
    const match = value.match(/^(.*?)\s+(10|[0-9](?:[.,]\d+)?)\s*(?:\([^)]*\))?\s+(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})(?:\s+\d{3,})?(?:\s+(aprobada?|regularizada?|regular|pendiente|desaprobada?|libre|promocionada?|equivalencia))?\s*$/i);
    if (!match) {
      // Only carry plain name fragments; never borrow a neighbouring row's data.
      pending = /^[A-Za-zÀ-ÖØ-öø-ÿ\s,.'’()-]+$/.test(line) ? value : "";
      continue;
    }
    pending = "";
    const rawName = match[1].trim();
    if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(rawName)) continue;
    const grade = Number(match[2].replace(",", "."));
    const parts = match[3].split("/");
    const passedAt = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : match[3];
    const explicit = match[4]?.toLowerCase();
    const status = explicit ? (/^(regular)/.test(explicit) ? "regular" : /^(pendiente|desaprob|libre)/.test(explicit) ? "pending" : "passed") : section ?? (grade >= 4 ? "passed" : "pending");
    const item = { rawName, grade, passedAt, status } satisfies ParsedAnalyticSubject;
    const existing = subjects.find(subject => normalizeSubjectName(subject.rawName) === normalizeSubjectName(rawName));
    if (!existing) subjects.push(item);
    else if (existing.grade !== grade || existing.passedAt !== passedAt || existing.status !== status) warnings.push(`Hay más de un resultado para ${rawName}. Revisá cuál corresponde antes de guardar.`);
  }
  if (!subjects.length) warnings.push("No encontramos materias en el analítico.");
  return {
    detectedDegree: detectDegree(text), detectedCurriculum: detectCurriculum(text), subjects, warnings,
    reportedApprovedCount: metadataNumber(text, /total\s+(?:de\s+)?asignaturas\s+aprobadas\s*[:\-]?\s*(\d+)/i),
    reportedAverage: metadataNumber(text, /promedio\s+acad[eé]mico\s*(?:\([^)]*\))?\s*:\s*(\d+(?:[.,]\d+)?)/i),
    reportedProgress: metadataNumber(text, /porcentaje\s+de\s+avance\s*:[^\r\n%]*?([0-9]+(?:[.,][0-9]+)?)\s*%/i)
  };
}

