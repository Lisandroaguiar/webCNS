"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Lock, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";
import { saveUserSubjects, type SubjectStatus } from "@/lib/supabase/mvp-queries";
import { subjectsForDegree, requirements2006, plan2006Source } from "@/lib/academic/degree-catalog";
import { detectDegree, degreeOptions, type DegreeValue } from "@/lib/academic/curriculum";
import { parseAnalitico } from "@/lib/analitico";
import { normalizeSubjectName, type ParsedAnalyticSubject } from "@/lib/academic/analytic-parser";

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

export function MateriasManager() {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [catalog, setCatalog] = useState<Subject[]>([]);
  const [rows, setRows] = useState<SubjectRow[]>([]);
  const [history, setHistory] = useState<SavedHistory[]>([]);
  const [correlatives, setCorrelatives] = useState<Correlative[]>([]);
  const [manual, setManual] = useState(emptyManual);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasImport, setHasImport] = useState(false);
  const profileLoaded = useRef(false);
  const [changingDegree, setChangingDegree] = useState(false);
  const [degree, setDegree] = useState<DegreeValue>("licenciatura");
  const [curriculum, setCurriculum] = useState<"old" | "new">("old");

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
      const selectedDegree = detectDegree(user.user_metadata?.degree ?? "") ?? "licenciatura";
      setDegree(selectedDegree);
      if (!profileLoaded.current) {
        profileLoaded.current = true;
        const savedCurriculum = profile?.curriculum === "new" ? "new" : "old";
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
    setMessage("");
    setError("");
  }

  function updateRow(id: string | number, changes: Partial<SubjectRow>) {
    setRows(current => current.map(row => String(row.id) === String(id) ? { ...row, ...changes } : row));
    setHasImport(true);
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

  function isSubjectUnlocked(subject: Subject) {
    if (curriculum === "old") {
      const requirement = requirements2006[subject.code ?? ""];
      if (!requirement) return true;
      const meets = (code: string, needsPassed: boolean) => {
        const required = catalog.find(candidate => candidate.code === code);
        if (!required) return false;
        const current = rowFor(required);
        const saved = savedFor(required);
        const status = current ? current.estado : saved?.status;
        return status === "aprobada" || status === "passed" || (!needsPassed && status === "regular");
      };
      return requirement.regular.every(code => meets(code, false)) && requirement.passed.every(code => meets(code, true));
    }
    return requiredSubjectsFor(subject).every(required => {
      const current = rowFor(required);
      const saved = savedFor(required);
      return current?.estado === "aprobada" || current?.estado === "regular"
        || saved?.status === "passed" || saved?.status === "regular";
    });
  }

  function toggleSubject(subject: Subject, checked: boolean) {
    if (checked && !isSubjectUnlocked(subject)) return;
    const current = rowFor(subject);
    const saved = savedFor(subject);
    if (checked) {
      setRows(rowsBefore => {
        const existing = rowsBefore.find(row => String(row.id) === String(subject.id));
        if (existing) return rowsBefore.map(row => String(row.id) === String(subject.id)
          ? { ...row, detected: true, estado: row.estado === "pendiente" ? "aprobada" : row.estado }
          : row);
        return [...rowsBefore, {
          ...toRow(subject, true),
          estado: saved?.status === "regular" ? "regular" : "aprobada",
          nota: saved?.grade == null ? "" : String(saved.grade),
          fecha_aprobacion: saved?.passed_at ?? ""
        }];
      });
    } else if (current) {
      updateRow(subject.id, { detected: false, estado: "pendiente" });
    }
    setHasImport(true);
    setMessage("");
    setError("");
  }

  async function processFile() {
    if (!file) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      if (!catalog.length) {
        setError("El plan de estudios está vacío en Supabase. Ejecutá supabase/seed-subjects.sql en el SQL Editor y recargá la página.");
        return;
      }
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let content = "";
      let pdfSubjects: ParsedAnalyticSubject[] = [];
      let pdfTextPresent = true;
      if (isPdf) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/parse-analitico", { method: "POST", body: formData });
        const responseText = await response.text();
        let result: { error?: string; subjects?: ParsedAnalyticSubject[]; textPresent?: boolean };
        try {
          result = JSON.parse(responseText) as { text?: string; error?: string };
        } catch {
          throw new Error(`El servidor devolvió una respuesta no válida (HTTP ${response.status}). Reiniciá la aplicación e intentá nuevamente.`);
        }
        if (!response.ok) throw new Error(result.error || "No se pudo extraer el texto del PDF.");
        pdfSubjects = result.subjects ?? [];
        pdfTextPresent = result.textPresent ?? false;
      } else if (file.type.startsWith("text/") || /\.(csv|txt)$/i.test(file.name)) {
        content = await file.text();
      }
      const parsed = parseAnalitico(content, catalog);
      if (isPdf && !pdfTextPresent) {
        setError("El PDF no contiene texto seleccionable. Este archivo parece escaneado y necesita OCR.");
        return;
      }
      const detectedRows = catalog.map(subject => {
        const current = rows.find(row => String(row.id) === String(subject.id));
        const saved = history.find(item => String(item.subject_id) === String(subject.id));
        const normalized = content.toLocaleLowerCase();
        const parsedGrade = parsed.grades.get(String(subject.id));
        const pdfMatch = pdfSubjects.find(item => normalizeSubjectName(item.rawName) === normalizeSubjectName(subject.nombre));
        const found = Boolean(parsedGrade) || Boolean(pdfMatch) || normalized.includes(subject.nombre.toLocaleLowerCase());
        const line = content.split(/\r?\n/).find(item => item.toLocaleLowerCase().includes(subject.nombre.toLocaleLowerCase()));
        const gradeMatch = line?.match(/(?:nota|calificaci[oó]n)?\s*[:;,\-]?\s*([1-9](?:[.,]\d)?|10)(?:\s|$)/i);
        return {
          ...toRow(subject, found || !content),
          estado: found && (parsedGrade?.grade || pdfMatch?.grade || /aprob|promoc|final/i.test(line ?? ""))
            ? "aprobada"
            : current?.estado
              ?? (saved?.status === "passed" ? "aprobada" : saved?.status === "regular" ? "regular" : "pendiente"),
          nota: String(parsedGrade?.grade ?? pdfMatch?.grade ?? gradeMatch?.[1]?.replace(",", ".") ?? current?.nota ?? saved?.grade ?? ""),
          fecha_aprobacion: parsedGrade?.date ?? pdfMatch?.passedAt ?? current?.fecha_aprobacion ?? saved?.passed_at ?? "",
          detected: isPdf ? found : found || !content
        } as SubjectRow;
      });
      setRows(detectedRows);
      setHasImport(true);
      setMessage(content
        ? "Analítico leído. Revisá las materias detectadas y guardá los cambios."
        : "Archivo recibido. Se generó una pre-carga con las materias del plan para que confirmes tus aprobadas.");
    } catch (caughtError) {
      const detail = caughtError instanceof Error ? caughtError.message : "Error desconocido.";
      setError(`No se pudo leer el archivo: ${detail}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveRows() {
    setSaving(true);
    setError("");
    setMessage("");
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError("Tu sesión expiró. Volvé a iniciar sesión para guardar las materias.");
      setSaving(false);
      return;
    }
    const rowsToSave = rows.map(row => ({ ...row, nota: String(row.nota ?? "") }));
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
    const missingPassedGrade = rowsToSave.find(row => row.detected && row.estado === "aprobada" && !row.nota.trim());
    if (missingPassedGrade) {
      setError(`Ingresá la nota de «${missingPassedGrade.nombre}» antes de marcarla como aprobada.`);
      setSaving(false);
      return;
    }
    const payload = rowsToSave.map(row => ({
      subjectId: row.id,
      status: (row.estado === "aprobada" ? "passed" : row.estado === "regular" ? "regular" : "pending") as SubjectStatus,
      grade: row.nota.trim() ? Number(row.nota.replace(",", ".")) : undefined,
      passedAt: undefined
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
    <div className="card">
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
    </div>
    <div className="card">
      <h2 className="font-display text-xl font-bold">Importar analítico</h2>
      <p className="mt-2 text-sm text-ink/60">Subí un PDF con texto seleccionable, CSV o TXT. Vas a poder revisar todo antes de guardar.</p>
      <label className="mt-5 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ink/15 p-8 text-sm text-ink/60 hover:border-coral">
        <Upload size={20} />{file ? file.name : "Elegir archivo"}
        <input className="hidden" type="file" accept=".pdf,.csv,.txt,text/plain,text/csv,application/pdf" onChange={event => { setFile(event.target.files?.[0] || null); setMessage(""); setError(""); }} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button disabled={!file || loading} onClick={() => void processFile()} className="button-primary mt-4 disabled:cursor-not-allowed disabled:opacity-40">
          {loading ? <><Loader2 className="mr-2 inline animate-spin" size={16} /> Procesando...</> : "Procesar analítico"}
        </button>
        {hasImport && rows.length > 0 && <button disabled={saving} onClick={() => void saveRows()} className="mt-4 rounded-xl border-2 border-ink bg-lime px-5 py-3 font-semibold shadow-[3px_3px_0_0_#000] disabled:opacity-50">{saving ? "Guardando..." : "Guardar materias"}</button>}
      </div>
      {message && <p className="mt-3 text-sm font-medium text-green-700">{message}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </div>

    <div className="card">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Plan completo</p>
          <h2 className="font-display text-xl font-bold">Marcá tu recorrido</h2>
          <p className="mt-2 text-sm text-ink/60">Tildá una materia para registrarla. El resaltado flúo indica tu selección.</p>
        </div>
        {hasImport && rows.length > 0 && <button disabled={saving} onClick={() => void saveRows()} className="rounded-xl border-2 border-ink bg-lime px-5 py-3 font-semibold shadow-[3px_3px_0_0_#000] disabled:opacity-50">{saving ? "Guardando..." : "Guardar materias"}</button>}
      </div>
      <div className="mt-6 space-y-7">
        {[1, 2, 3, 4, 5].map(year => {
          const yearSubjects = catalog.filter(subject => subject.anio === year);
          if (!yearSubjects.length) return null;
          return <section key={year}>
            <h3 className="mb-3 inline-block border-b-4 border-lime font-display text-lg font-bold">Año {year}</h3>
            <div className="space-y-2">
              {yearSubjects.map(subject => {
                const row = rowFor(subject);
                const saved = savedFor(subject);
                const unlocked = isSubjectUnlocked(subject);
                const missingRequirements = requiredSubjectsFor(subject).filter(required => {
                  const current = rowFor(required);
                  const requiredSaved = savedFor(required);
                  return current?.estado !== "aprobada" && current?.estado !== "regular"
                    && requiredSaved?.status !== "passed" && requiredSaved?.status !== "regular";
                });
                const checked = Boolean(row?.detected || (!row && saved?.status === "passed"));
                const activeRow = row ?? (checked ? {
                  ...toRow(subject, true),
                  estado: "aprobada" as const,
                  nota: saved?.grade == null ? "" : String(saved.grade),
                  fecha_aprobacion: saved?.passed_at ?? ""
                } : null);
                return <div key={subject.id} className={`relative min-w-0 overflow-hidden rounded-xl border-2 p-3 transition ${checked ? "border-ink bg-yellow-100 shadow-[3px_3px_0_0_#000]" : "border-ink/10 bg-cream/50"} ${!unlocked ? "opacity-75" : ""}`}>
                  {checked && <span aria-hidden className="marker-fluo" />}
                  <div className="relative z-[1] grid min-w-0 gap-4 md:grid-cols-[auto_minmax(0,1fr)_minmax(220px,auto)] md:items-center md:gap-3">
                    <div className="flex min-w-0 items-start gap-3 md:contents">
                      <input className="mt-0.5 h-5 w-5 shrink-0 accent-ink disabled:cursor-not-allowed md:mt-0" type="checkbox" checked={checked} disabled={!unlocked && !checked} onChange={event => toggleSubject(subject, event.target.checked)} />
                      <div className="flex min-w-0 items-start gap-2">
                        {!unlocked && <Lock aria-label="Materia bloqueada por correlativas" size={16} className="mt-0.5 shrink-0 text-ink/45" />}
                        <span className="min-w-0 [overflow-wrap:anywhere] font-medium leading-snug">{subject.nombre}</span>
                      </div>
                    </div>
                    {unlocked && activeRow && <div className="grid min-w-0 w-full gap-3 sm:grid-cols-2 md:max-w-md md:grid-cols-[120px_100px] md:gap-2">
                      <label className="min-w-0 text-xs font-bold md:text-[0px]"><span className="mb-1 block md:sr-only">Estado</span><select aria-label={`Estado de ${subject.nombre}`} className="input min-h-11 w-full py-2 text-sm" value={activeRow.estado} onChange={event => updateRow(subject.id, { estado: event.target.value as SubjectRow["estado"] })}><option value="pendiente">Pendiente</option><option value="regular">Regular</option><option value="aprobada">Aprobada</option></select></label>
                      <label className="min-w-0 text-xs font-bold md:text-[0px]"><span className="mb-1 block md:sr-only">Nota</span><input aria-label={`Nota de ${subject.nombre}`} className="input min-h-11 w-full py-2 text-sm" type="number" min="1" max="10" step="0.1" placeholder="Nota" value={activeRow.nota} onChange={event => updateRow(subject.id, { nota: event.target.value })} /></label>
                    </div>}
                  </div>
                  {!unlocked && missingRequirements.length > 0 && <p className="relative z-[1] mt-2 pl-8 text-xs font-medium text-ink/55">Necesitás aprobar o regularizar: {missingRequirements.map(required => required.nombre).join(", ")} para poder cursarla.</p>}
                </div>;
              })}
            </div>
          </section>;
        })}
      </div>
    </div>
  </div>;
}

