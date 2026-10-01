"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";
import { saveUserSubjects, type SubjectStatus } from "@/lib/supabase/mvp-queries";
import { subjectsForDegree, requirements2006, plan2006Source } from "@/lib/academic/degree-catalog";
import { detectDegree, degreeOptions, type DegreeValue } from "@/lib/academic/curriculum";
import { getCourseEligibility } from "@/lib/academic/course-eligibility";
import { parseAnalitico } from "@/lib/analitico";
import { type ParsedAnalytic, type ParsedAnalyticSubject } from "@/lib/academic/analytic-parser";
import { matchAnalyticSubjects, type MatchedAnalyticSubject } from "@/lib/academic/match-analytic-subjects";
import { AcademicSubjectCard, type SubjectCardStatus } from "@/components/academic/academic-subject-card";
import { SubjectDetailDialog } from "@/components/academic/subject-detail-dialog";
import { academicMatchLabel, AnalyticDocumentNotice, AnalyticRecognition, AnalyticUploadCaution, AnalyticUploadGuide } from "@/components/academic/analytic-upload-guide";
import { gradeAverage } from "@/lib/academic/grade-average";

type Subject = {
  id: string | number;
  nombre: string;
  code: string | null;
  anio: number | null;
  curriculum: "old" | "new";
};

type SubjectRow = Subject & {
  estado: "pendiente" | "regular" | "aprobada";
  nota: string;
  fecha_aprobacion: string;
  detected: boolean;
};

type SavedHistory = {
  subject_id: string | number;
  status: string;
  grade: number | null;
  passed_at: string | null;
};

type Correlative = {
  subject_id: string | number;
  required_subject_id: string | number;
};

const emptyManual = { subjectId: "", nota: "", fecha: "" };

function toRow(subject: Subject, detected = false): SubjectRow {
  return { ...subject, estado: "pendiente", nota: "", fecha_aprobacion: "", detected };
}

export function MateriasManager({ managedByEnrollment = false, initialDegree = "licenciatura", initialCurriculum = "old" }: { managedByEnrollment?: boolean; initialDegree?: DegreeValue; initialCurriculum?: "old" | "new" }) {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfPreview, setPdfPreview] = useState<ParsedAnalytic | null>(null);
  const [catalog, setCatalog] = useState<Subject[]>([]);
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [history, setHistory] = useState<SavedHistory[]>([]);
  const [correlatives, setCorrelatives] = useState<Correlative[]>([]);
  const [manual, setManual] = useState(emptyManual);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectEdit, setSubjectEdit] = useState({ estado: "pendiente" as SubjectRow["estado"], nota: "", fecha_aprobacion: "" });
  const [hasImport, setHasImport] = useState(false);
  const [importMatches, setImportMatches] = useState<MatchedAnalyticSubject[]>([]);
  const [importPlanConfirmed, setImportPlanConfirmed] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const profileLoaded = useRef(false);
  const [changingDegree, setChangingDegree] = useState(false);
  const [degree, setDegree] = useState<DegreeValue>(initialDegree);
  const [curriculum, setCurriculum] = useState<"old" | "new">(initialCurriculum);
  const [eligibilityFilter, setEligibilityFilter] = useState<"all" | "available" | "in_progress" | "completed" | "blocked">("all");
  const eligibility = useMemo(() => getCourseEligibility({ subjects: catalog.map(item => ({ id: item.id, name: item.nombre, code: item.code, year: item.anio, curriculum: item.curriculum })), userSubjects: history, curriculum, degree }), [catalog, history, curriculum, degree]);
  const eligibilityById = useMemo(() => new Map(eligibility.map(item => [String(item.subject.id), item])), [eligibility]);

  useEffect(() => {
    async function loadCatalogAndHistory() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { setError("Volvé a iniciar sesión para cargar tu recorrido."); return; }
      const [profileResult, catalogResult, historyResult, correlativesResult] = await Promise.all([
        supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
        supabase.from("subjects").select("id, name, code, year, curriculum").eq("curriculum", curriculum).order("year", { ascending: true }).order("name", { ascending: true }),
        supabase.from("user_subjects").select("subject_id, status, grade, passed_at").eq("user_id", user.id),
        supabase.from("correlatives").select("subject_id, required_subject_id")
      ]);
      const { data: profile } = profileResult;
      const selectedDegree = managedByEnrollment ? initialDegree : detectDegree(user.user_metadata?.degree ?? "") ?? "licenciatura";
      setDegree(selectedDegree);
      if (!profileLoaded.current) {
        profileLoaded.current = true;
        const savedCurriculum = managedByEnrollment ? initialCurriculum : profile?.curriculum === "new" ? "new" : "old";
        if (savedCurriculum !== curriculum) { setCurriculum(savedCurriculum); return; }
      }

      const { data, error: catalogError } = catalogResult;
      if (catalogError) {
        const missingTable = catalogError.code === "PGRST205" || /schema cache|relation .* does not exist/i.test(catalogError.message);
        setError(missingTable
          ? "No se encontró el plan de estudios. Ejecutá supabase/mvp-schema.sql en el SQL Editor de Supabase y recargá esta página."
          : `No se pudo cargar el plan de estudios: ${catalogError.message}`);
      }
      if (catalogError) return;

      const subjects = subjectsForDegree(data ?? [], selectedDegree, curriculum).map(item => ({ id: item.id, code: item.code, nombre: item.name, anio: item.year, curriculum: item.curriculum as "old" | "new" }));
      setCatalog(subjects);

      const { data: history, error: historyError } = historyResult;
      if (historyError) {
        setError(`No se pudo cargar tu historial: ${historyError.message}`);
        return;
      }

      setHistory((history ?? []) as SavedHistory[]);
      const { data: correlativeData, error: correlativesError } = correlativesResult;
      if (correlativesError) {
        setError(`No se pudieron cargar las correlatividades: ${correlativesError.message}`);
        return;
      }
      setCorrelatives((correlativeData ?? []) as Correlative[]);
      setRows((history ?? []).flatMap(item => {
        const subject = subjects.find(candidate => String(candidate.id) === String(item.subject_id));
        if (!subject) return [];
        return [{
          ...toRow(subject, item.status !== "pending"),
          estado: item.status === "passed" ? "aprobada" : item.status === "regular" ? "regular" : "pendiente",
          nota: item.grade == null ? "" : String(item.grade),
          fecha_aprobacion: item.passed_at ?? ""
        } as SubjectRow];
      }));
    }
    void loadCatalogAndHistory();
  }, [curriculum, degree, supabase]);

  async function changeDegree(value: DegreeValue) {
    if (value === degree) return;
    setChangingDegree(true);
    setError("");
    try {
      await saveAcademicProfile(supabase, value, curriculum);
      setRows([]);
      setHistory([]);
      setCorrelatives([]);
      setCatalog([]);
      setHasImport(false);
      setImportMatches([]);
      setImportWarnings([]);
      setDegree(value);
      setMessage("Carrera actualizada. Tus materias guardadas se conservan.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos cambiar la carrera.");
    } finally { setChangingDegree(false); }
  }

  async function changeCurriculum(value: "old" | "new") {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Tu sesión expiró."); return; }
    const { error: profileError } = await supabase.from("profiles").update({ curriculum: value }).eq("id", user.id);
    if (profileError) { setError("No pudimos guardar el plan elegido."); return; }
    setCurriculum(value);
    window.localStorage.setItem("cronopios-curriculum", value);
    document.cookie = `cronopios-curriculum=${value}; path=/; max-age=31536000; samesite=lax`;
    setRows([]);
    setHistory([]);
    setCorrelatives([]);
    setHasImport(false);
    setImportMatches([]);
    setImportWarnings([]);
    setMessage("");
    setError("");
  }

  function rowFor(subject: Subject) {
    return rows.find(row => String(row.id) === String(subject.id));
  }

  function savedFor(subject: Subject) {
    return history.find(item => String(item.subject_id) === String(subject.id));
  }

  function requiredSubjectsFor(subject: Subject) {
    if (curriculum === "old") {
      const requirement = requirements2006[subject.code ?? ""];
      const codes = requirement ? [...requirement.regular, ...requirement.passed] : [];
      return catalog.filter(candidate => codes.includes(candidate.code ?? ""));
    }
    return correlatives
      .filter(item => String(item.subject_id) === String(subject.id))
      .map(requirement => catalog.find(candidate => String(candidate.id) === String(requirement.required_subject_id)))
      .filter((required): required is Subject => Boolean(required));
  }

  function openSubject(subject: Subject) {
    const saved = savedFor(subject);
    const row = rowFor(subject);
    setSubjectEdit({
      estado: row?.estado ?? (saved?.status === "passed" ? "aprobada" : saved?.status === "regular" ? "regular" : "pendiente"),
      nota: row?.nota ?? (saved?.grade == null ? "" : String(saved.grade)),
      fecha_aprobacion: row?.fecha_aprobacion ?? saved?.passed_at ?? "",
    });
    setEditingSubjectId(String(subject.id));
  }

  async function saveSubjectEdit(subject: Subject) {
    const normalizedGrade = subjectEdit.nota.trim().replace(",", ".");
    const grade = normalizedGrade ? Number(normalizedGrade) : undefined;
    if (grade !== undefined && (!Number.isFinite(grade) || grade < 1 || grade > 10)) {
      setError("La nota debe ser un número entre 1 y 10.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
      const status: SubjectStatus = subjectEdit.estado === "aprobada" ? "passed" : subjectEdit.estado === "regular" ? "regular" : "pending";
      const { error: saveError } = await saveUserSubjects(supabase, user.id, [{ subjectId: subject.id, status, grade, passedAt: subjectEdit.fecha_aprobacion || undefined }]);
      if (saveError) throw new Error("No pudimos guardar esta materia. Intentá nuevamente.");
      const { data: refreshed, error: refreshError } = await supabase.from("user_subjects").select("subject_id,status,grade,passed_at").eq("user_id", user.id).eq("subject_id", subject.id).maybeSingle();
      if (refreshError || !refreshed) throw new Error("El guardado se envió, pero no pudimos confirmarlo. Recargá la página.");
      setHistory(current => [...current.filter(item => String(item.subject_id) !== String(subject.id)), refreshed as SavedHistory]);
      setRows(current => current.map(row => String(row.id) === String(subject.id) ? { ...row, ...subjectEdit, detected: status !== "pending" } : row));
      setEditingSubjectId(null);
      setMessage("Materia guardada correctamente.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar esta materia.");
    } finally {
      setSaving(false);
    }
  }

  async function processFile(approvedPdf?: ParsedAnalytic) {
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    setImportMatches([]);
    setImportWarnings([]);
    setImportPlanConfirmed(false);
    setHasImport(false);
    try {
      if (!catalog.length) {
        setError("El plan de estudios está vacío en Supabase. Ejecutá supabase/seed-subjects.sql en el SQL Editor y recargá la página.");
        return;
      }
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let content = "";
      let pdfSubjects: ParsedAnalyticSubject[] = [];
      let parsedPdf: ParsedAnalytic | null = null;
      let pdfTextPresent = true;
      if (isPdf) {
        let result: Partial<ParsedAnalytic> & { error?: string; textPresent?: boolean } = approvedPdf ?? {};
        if (!approvedPdf) {
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/parse-analitico", { method: "POST", body: formData });
          const responseText = await response.text();
          try {
            result = JSON.parse(responseText) as Partial<ParsedAnalytic> & { error?: string; textPresent?: boolean };
          } catch {
            throw new Error(`El servidor devolvió una respuesta no válida (HTTP ${response.status}). Reiniciá la aplicación e intentá nuevamente.`);
          }
          if (!response.ok) throw new Error(result.error || "No se pudo extraer el texto del PDF.");
        }
        pdfSubjects = result.subjects ?? [];
        pdfTextPresent = approvedPdf ? true : result.textPresent ?? false;
        parsedPdf = result as ParsedAnalytic;
        if (parsedPdf.detectedProgramFamily === "Artes Plásticas") {
          setError("Este analítico es de Artes Plásticas. Importalo desde Mis trayectorias para conservar el título, plan y orientación correctos.");
          return;
        }
        if (!approvedPdf) {
          setPdfPreview(parsedPdf);
          if (parsedPdf.documentType !== "ANALYTIC_WITH_REGULARIZED") return;
        }
      } else if (file.type.startsWith("text/") || /\.(csv|txt)$/i.test(file.name)) {
        content = await file.text();
      }
      const parsed = parseAnalitico(content, catalog);
      if (!isPdf && !parsed.grades.size) { setError("No reconocimos filas completas de materias y notas en este archivo. Probá con el PDF original o cargá las materias a mano."); return; }
      if (isPdf && !pdfTextPresent) {
        setError("El PDF no contiene texto seleccionable. Este archivo parece escaneado y necesita OCR.");
        return;
      }
      if (isPdf && !pdfSubjects.length) { setError("No encontramos materias en este PDF. Probá con el analítico original o cargalas a mano."); return; }
      if (parsedPdf?.detectedCurriculum && parsedPdf.detectedCurriculum !== curriculum || parsedPdf?.detectedDegree && parsedPdf.detectedDegree !== degree) {
        setError("El analítico indica otra carrera o plan. Revisá tu selección antes de importarlo.");
        return;
      }
      const { data: aliases } = isPdf ? await supabase.from("subject_aliases").select("subject_id,alias,verified").eq("curriculum", curriculum).eq("verified", true) : { data: [] };
      const matches = isPdf ? matchAnalyticSubjects(pdfSubjects, catalog.map(subject => ({ id: subject.id, nombre: subject.nombre })), aliases ?? []) : [];
      if (isPdf) {
        setImportMatches(matches);
        setImportPlanConfirmed(Boolean(parsedPdf?.detectedCurriculum && parsedPdf?.detectedDegree));
        setImportWarnings([...(parsedPdf?.warnings ?? []), ...(parsedPdf?.reportedApprovedCount !== undefined && parsedPdf.reportedApprovedCount !== matches.length ? [`El analítico informa ${parsedPdf.reportedApprovedCount} aprobadas, pero detectamos ${matches.length} filas. Revisá el PDF antes de guardar.`] : [])]);
      } else { setImportMatches([]); setImportPlanConfirmed(true); setImportWarnings([]); }
      const detectedRows = catalog.map(subject => {
        const current = rows.find(row => String(row.id) === String(subject.id));
        const saved = history.find(item => String(item.subject_id) === String(subject.id));
        const parsedGrade = parsed.grades.get(String(subject.id));
        const pdfMatch = matches.find(item => String(item.subjectId) === String(subject.id));
        const found = Boolean(parsedGrade) || Boolean(pdfMatch);
        return {
          ...toRow(subject, found || !content),
          estado: pdfMatch ? pdfMatch.status === "regular" ? "regular" : pdfMatch.status === "pending" ? "pendiente" : "aprobada"
            : parsedGrade?.grade && Number(parsedGrade.grade) >= 4 ? "aprobada"
            : current?.estado
              ?? (saved?.status === "passed" ? "aprobada" : saved?.status === "regular" ? "regular" : "pendiente"),
          nota: String(parsedGrade?.grade ?? pdfMatch?.grade ?? current?.nota ?? saved?.grade ?? ""),
          fecha_aprobacion: parsedGrade?.date ?? pdfMatch?.passedAt ?? current?.fecha_aprobacion ?? saved?.passed_at ?? "",
          detected: isPdf ? found : found || !content
        } as SubjectRow;
      });
      setRows(detectedRows);
      setHasImport(true);
      setMessage(isPdf ? `Analítico leído: ${pdfSubjects.length} materias, ${matches.filter(item => item.subjectId).length} reconocidas y ${matches.filter(item => !item.reviewed).length} para revisar.` : "Archivo leído. Revisá las materias detectadas antes de guardar.");
    } catch (caughtError) {
      const detail = caughtError instanceof Error ? caughtError.message : "Error desconocido.";
      setError(`No se pudo leer el archivo: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  function resolveImportMatch(index: number, value: string) {
    const item = importMatches[index];
    if (!item) return;
    const chosen = value && value !== "__ignore" ? catalog.find(subject => String(subject.id) === value) : undefined;
    setImportMatches(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, subjectId: chosen?.id, ignored: value === "__ignore", reviewed: Boolean(value) } : row));
    if (chosen) setRows(current => current.map(row => String(row.id) === String(chosen.id) ? {
      ...row, detected: true, estado: item.status === "regular" ? "regular" : item.status === "pending" ? "pendiente" : "aprobada",
      nota: item.grade == null ? row.nota : String(item.grade), fecha_aprobacion: item.passedAt ?? row.fecha_aprobacion
    } : row));
    setError("");
  }

  async function saveRows() {
    if (importMatches.length && (!importPlanConfirmed || importMatches.some(item => !item.reviewed))) {
      setError("Confirmá carrera y plan y resolvé todas las materias del PDF antes de guardar."); return;
    }
    const selectedIds = importMatches.filter(item => item.subjectId).map(item => String(item.subjectId));
    if (new Set(selectedIds).size !== selectedIds.length) { setError("Hay materias duplicadas en la revisión. Resolvelas antes de guardar."); return; }
    setSaving(true);
    setError("");
    setMessage("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Tu sesión expiró. Volvé a iniciar sesión para guardar las materias.");
      setSaving(false);
      return;
    }
    const rowsToSave = rows.filter(row => !importMatches.length || selectedIds.includes(String(row.id))).map(row => ({ ...row, nota: String(row.nota ?? "") }));
    const invalidGrade = rowsToSave.find(row => {
      if (!row.nota.trim()) return false;
      const grade = Number(row.nota.replace(",", "."));
      return !Number.isFinite(grade) || grade < 1 || grade > 10;
    });
    if (invalidGrade) {
      setError(`La nota de «${invalidGrade.nombre}» debe ser un número entre 1 y 10.`);
      setSaving(false);
      return;
    }
    const payload = rowsToSave.map(row => ({
      subjectId: row.id,
      status: (row.estado === "aprobada" ? "passed" : row.estado === "regular" ? "regular" : "pending") as SubjectStatus,
      grade: row.nota.trim() ? Number(row.nota.replace(",", ".")) : undefined,
      passedAt: row.fecha_aprobacion || undefined
    }));
    if (!payload.length) {
      setError("No hay materias para guardar. Procesá un archivo o agregá una materia manualmente.");
      setSaving(false);
      return;
    }
    try {
      const { error: saveError } = await saveUserSubjects(supabase, user.id, payload);
      if (saveError) {
        setError(`No se pudieron guardar las materias: ${saveError.message || "Supabase rechazó la operación"} (código ${saveError.code ?? "desconocido"}).`);
        return;
      }

      const { data: refreshedHistory, error: refreshError } = await supabase
        .from("user_subjects")
        .select("subject_id, status, grade, passed_at")
        .eq("user_id", user.id);
      if (refreshError) {
        setError(`Las materias se enviaron, pero no se pudo confirmar la lectura del historial: ${refreshError.message}`);
        return;
      }
      setHistory((refreshedHistory ?? []) as SavedHistory[]);
      setMessage(`${payload.length} materia(s) guardada(s) correctamente.`);
      setHasImport(false);
      setEditingSubjectId(null);
      setImportMatches([]);
      setImportWarnings([]);
    } catch (caughtError) {
      const detail = caughtError instanceof Error ? caughtError.message : "Error desconocido.";
      setError(`No se pudieron guardar las materias: ${detail}`);
    } finally {
      setSaving(false);
    }
  }

  function addManualSubject(event: React.FormEvent) {
    event.preventDefault();
    const subject = catalog.find(item => String(item.id) === manual.subjectId);
    if (!subject) return;
    setRows(current => {
      const existing = current.find(row => row.id === subject.id);
      if (existing) return current;
      const saved = history.find(item => String(item.subject_id) === String(subject.id));
      return [...current, {
        ...toRow(subject, true),
        nota: manual.nota || (saved?.grade == null ? "" : String(saved.grade)),
        fecha_aprobacion: saved?.passed_at || "",
        estado: manual.nota ? "aprobada" : saved?.status === "passed" ? "aprobada" : saved?.status === "regular" ? "regular" : "pendiente"
      }];
    });
    setHasImport(true);
    setManual(emptyManual);
    setMessage("Materia agregada a la lista. Presioná «Guardar materias» para persistirla.");
  }

  return <div className="space-y-6">
    {!managedByEnrollment && <div className="card">
      <p className="eyebrow">Plan de estudios</p>
      <label className="mt-2 block font-display text-xl font-bold" htmlFor="degree">Elegí tu carrera</label>
      <select id="degree" className="input mt-3 min-h-11 w-full max-w-xl" value={degree} disabled={changingDegree || saving || loading || hasImport} onChange={event => void changeDegree(event.target.value as DegreeValue)}>
        {degreeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {changingDegree && <p role="status" className="mt-2 text-sm">Actualizando carrera...</p>}
      {hasImport && <p className="mt-2 text-sm">Guardá tus cambios de materias antes de cambiar de carrera.</p>}
      {curriculum === "old" && <a href={plan2006Source} target="_blank" rel="noreferrer" className="text-sm underline">Consultar plan oficial 2006</a>}
      <label className="mt-2 block font-display text-xl font-bold" htmlFor="curriculum">Elegí tu plan</label>
      <select id="curriculum" disabled={changingDegree || saving || loading} className="input mt-4 max-w-xl" value={curriculum} onChange={event => changeCurriculum(event.target.value as "old" | "new")}>
        <option value="old">Plan 2006 (plan viejo)</option>
        <option value="new">Plan 2024 (plan nuevo)</option>
      </select>
      <p className="mt-2 text-sm text-ink/60">El plan elegido determina las materias y correlativas de tu recorrido.</p>
    </div>}
    <div className="card">
      <h2 className="font-display text-xl font-bold">Importar analítico</h2>
      <Link href="/dashboard/trayectorias" className="mt-2 inline-block text-sm font-bold underline">¿Tu analítico es de Artes Plásticas? Importalo en Mis trayectorias.</Link>
      <div className="mt-3"><AnalyticUploadGuide /></div>
      <p className="mt-2 text-xs text-ink/60">También podés cargar CSV o TXT; vas a revisar todo antes de guardar.</p>
      <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink/15 p-8 text-sm text-ink/60 hover:border-coral">
        <Upload size={20} />{file ? file.name : "Subir analítico"}
        <input ref={fileInputRef} className="hidden" type="file" accept=".pdf,.csv,.txt,text/plain,text/csv,application/pdf" onChange={event => { setFile(event.target.files?.[0] || null); setPdfPreview(null); setHasImport(false); setMessage(""); setError(""); }} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button disabled={!file || loading} onClick={() => void processFile()} className="button-secondary mt-4">
          {loading ? <><Loader2 className="mr-2 inline animate-spin" size={16} /> Procesando...</> : "Procesar analítico"}
        </button>
        {hasImport && rows.length > 0 && <button disabled={saving} onClick={() => void saveRows()} className="button-primary mt-4">{saving ? "Guardando..." : "Guardar materias"}</button>}
      </div>
      <AnalyticUploadCaution />
      {pdfPreview && pdfPreview.documentType !== "ANALYTIC_WITH_REGULARIZED" && <AnalyticDocumentNotice documentType={pdfPreview.documentType} subjectsFound={pdfPreview.subjects.length} textPresent={pdfPreview.textPresent} onTry={() => void processFile(pdfPreview)} onChooseAnother={() => { setFile(null); setPdfPreview(null); if (fileInputRef.current) { fileInputRef.current.value = ""; fileInputRef.current.click(); } }} />}
      {pdfPreview?.documentType === "ANALYTIC_WITH_REGULARIZED" && <AnalyticRecognition parsed={pdfPreview} />}
      {message && <p className="mt-3 text-sm font-medium text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>

    {importMatches.length > 0 && <section className="card" aria-labelledby="analytic-review-title">
      <h2 id="analytic-review-title" className="font-display text-xl font-bold">Revisá las materias del analítico</h2>
      <p className="mt-2 text-sm">{importMatches.length} detectadas · {importMatches.filter(item => item.subjectId).length} reconocidas · {importMatches.filter(item => !item.reviewed).length} necesitan revisión</p>
      {importWarnings.map(warning => <p key={warning} className="mt-2 border-l-4 border-amber-500 bg-amber-50 p-2 text-sm">{warning}</p>)}
      <label className="mt-4 flex items-start gap-2 text-sm font-bold"><input type="checkbox" checked={importPlanConfirmed} onChange={event => setImportPlanConfirmed(event.target.checked)} /> Confirmé que este analítico corresponde a la carrera y plan elegidos arriba.</label>
      <div className="mt-4 space-y-3">{importMatches.map((item, index) => <div key={`${item.rawName}-${index}`} className="border-l-4 border-ink/30 bg-cronopios-paper p-3">
        <p className="font-bold">{item.rawName} <span className="status-badge ml-2">{academicMatchLabel(item.kind)}</span></p>
        {item.candidateId && <p className="mt-1 text-xs">Sugerencia: {catalog.find(subject => String(subject.id) === String(item.candidateId))?.nombre}. Confirmala solo si coincide.</p>}
        <label className="mt-2 block text-sm font-bold">Materia del plan<select className="input mt-1" value={item.ignored ? "__ignore" : item.subjectId ?? ""} onChange={event => resolveImportMatch(index, event.target.value)}><option value="">Elegir materia</option><option value="__ignore">Ignorar esta fila</option>{catalog.map(subject => <option key={subject.id} value={subject.id}>{subject.nombre}</option>)}</select></label>
      </div>)}</div>
      <p className="mt-3 text-xs text-ink/65">Las sugerencias probables o ambiguas no se guardan hasta que las elijas. El PDF no se almacena.</p>
    </section>}

    <div className="card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Plan completo</p>
          <h2 className="font-display text-xl font-bold">Marcá tu recorrido</h2>
          <p className="mt-1 text-sm font-semibold">Promedio <span className="font-display text-lg">{gradeAverage(history) ?? "—"}</span></p>
          <p className="mt-2 text-sm text-ink/60">Tildá una materia para registrarla. El resaltado flúo indica tu selección.</p>
        </div>
        {hasImport && rows.length > 0 && <button disabled={saving} onClick={() => void saveRows()} className="button-primary">{saving ? "Guardando..." : "Guardar materias"}</button>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar materias por disponibilidad">
        {([ ["all", "Todas"], ["available", "Disponibles"], ["in_progress", "Regularizadas"], ["completed", "Aprobadas"], ["blocked", "Bloqueadas"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={eligibilityFilter === value} onClick={() => setEligibilityFilter(value)} className="filter-chip">{label}</button>)}
      </div>
      <p className="mt-2 text-xs text-ink/60">Los indicadores usan las materias guardadas. <a href="/dashboard/disponibles" className="font-bold underline">Ver requisitos en detalle</a>.</p>
      <div className="mt-6 space-y-7">
        {[1, 2, 3, 4, 5].map(year => {
          const yearSubjects = catalog.filter(subject => subject.anio === year && (eligibilityFilter === "all" || eligibilityById.get(String(subject.id))?.status === eligibilityFilter));
          if (!yearSubjects.length) return null;
          return <section key={year}>
            <h3 className="mb-3 inline-block border-b-4 border-lime font-display text-lg font-bold">Año {year}</h3>
            <div className="space-y-2">
              {yearSubjects.map(subject => {
                const courseStatus = eligibilityById.get(String(subject.id));
                const row = rowFor(subject);
                const saved = savedFor(subject);
                const currentStatus = row?.estado ?? (saved?.status === "passed" ? "aprobada" : saved?.status === "regular" ? "regular" : "pendiente");
                const cardStatus: SubjectCardStatus = currentStatus === "aprobada" ? "passed" : currentStatus === "regular" ? "regular" : courseStatus?.status === "available" ? "available" : courseStatus?.status === "unknown" ? "review" : "pending";
                const grade = row?.nota || saved?.grade || null;
                return <AcademicSubjectCard key={subject.id} name={subject.nombre} status={cardStatus} grade={grade} onOpen={() => openSubject(subject)} />;
              })}
            </div>
          </section>;
        })}
      </div>
      {editingSubjectId && (() => {
        const subject = catalog.find(item => String(item.id) === editingSubjectId);
        if (!subject) return null;
        const missingRequirements = requiredSubjectsFor(subject).filter(required => {
          const current = rowFor(required);
          const saved = savedFor(required);
          return current?.estado !== "aprobada" && current?.estado !== "regular" && saved?.status !== "passed" && saved?.status !== "regular";
        });
        return <SubjectDetailDialog title={subject.nombre} onClose={() => setEditingSubjectId(null)}>
          <label className="block text-sm font-bold">Estado<select aria-label={`Estado de ${subject.nombre}`} className="input mt-1 w-full" value={subjectEdit.estado} onChange={event => setSubjectEdit(current => ({ ...current, estado: event.target.value as SubjectRow["estado"] }))}><option value="pendiente">Sin cursar</option><option value="regular">Cursada aprobada</option><option value="aprobada">Aprobada</option></select></label>
          <label className="block text-sm font-bold">Nota opcional<input aria-label={`Nota de ${subject.nombre}`} className="input mt-1 w-full" type="number" min="1" max="10" step="0.1" value={subjectEdit.nota} onChange={event => setSubjectEdit(current => ({ ...current, nota: event.target.value }))} /></label>
          <details><summary className="cursor-pointer text-sm font-bold">Más información</summary><label className="mt-3 block text-sm font-bold">Fecha opcional<input aria-label={`Fecha de ${subject.nombre}`} className="input mt-1 w-full" type="date" value={subjectEdit.fecha_aprobacion} onChange={event => setSubjectEdit(current => ({ ...current, fecha_aprobacion: event.target.value }))} /></label>{missingRequirements.length > 0 && <p className="mt-3 text-sm text-ink/65">Para cursarla necesitás: {missingRequirements.map(required => required.nombre).join(", ")}.</p>}<Link href={`/dashboard/agenda?subject=${encodeURIComponent(String(subject.id))}`} className="mt-3 inline-block text-sm font-bold underline">Agregar a Mi agenda</Link></details>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="button" disabled={saving} onClick={() => void saveSubjectEdit(subject)} className="button-primary w-full">{saving ? "Guardando..." : "Guardar cambios"}</button>
        </SubjectDetailDialog>;
      })()}
      {hasImport && rows.length > 0 && <div className="mt-7 border-t-2 border-ink/15 pt-5">
        <button type="button" disabled={saving} onClick={() => void saveRows()} className="button-primary">{saving ? "Guardando..." : "Guardar materias"}</button>
        {message && <p className="mt-3 text-sm font-medium text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>}
    </div>
  </div>;
}

