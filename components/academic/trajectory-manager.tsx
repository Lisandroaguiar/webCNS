"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { subjectsForEnrollment, countKnownProgress, countChoiceRequirement, needsWorkshopOrientationReview, type CurriculumSubject, type Enrollment } from "@/lib/academic/multicarrera";
import { matchAnalyticSubjects, type MatchedAnalyticSubject } from "@/lib/academic/match-analytic-subjects";
import type { ParsedAnalytic } from "@/lib/academic/analytic-parser";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";
import { academicHistoryDetail, academicStatusLabel, enrollmentHistoryItems, validateAcademicEdit, type AcademicStatus } from "@/lib/academic/history-item";

type Program = { id: string; family: string; degree_type: Enrollment["degreeType"]; name: string };
type Plan = { id: string; family: string; display_name: string; catalog_kind: "legacy_subjects" | "curriculum_subjects"; requires_orientation: boolean; legacy_curriculum: "old" | "new" | null };
type Orientation = { id: string; family: string; name: string };
type SavedEnrollment = Enrollment & { isActive: boolean };
type Status = AcademicStatus;
type ReviewRow = MatchedAnalyticSubject & { workshopSelected?: boolean };
type WorkshopHistory = { id: string; raw_name: string; status: Status; grade: number | null; passed_at: string | null; workshop_option_id: string | null };
type EnrollmentHistory = { curriculum_subject_id: string; status: Status; grade: number | null; passed_at: string | null };
type PendingAcademicRecord = { id: string; raw_name: string; status: Status; grade: number | null; passed_at: string | null; match_kind: string };
type WorkshopOption = { id: string; orientation_id: string; verification_status: string };

export function TrajectoryManager({ userId }: { userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [orientations, setOrientations] = useState<Orientation[]>([]);
  const [enrollments, setEnrollments] = useState<SavedEnrollment[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<CurriculumSubject[]>([]);
  const [historyRows, setHistoryRows] = useState<EnrollmentHistory[]>([]);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ status: "pending" as Status, grade: "", date: "" });
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "regular" | "passed">("all");
  const [workshopHistory, setWorkshopHistory] = useState<WorkshopHistory[]>([]);
  const [pendingRecords, setPendingRecords] = useState<PendingAcademicRecord[]>([]);
  const [pendingChoices, setPendingChoices] = useState<Record<string, string>>({});
  const [workshopOptions, setWorkshopOptions] = useState<WorkshopOption[]>([]);
  const [workshopStorageReady, setWorkshopStorageReady] = useState(false);
  const [programId, setProgramId] = useState("plastica-lic");
  const [planId, setPlanId] = useState("plastica-2006");
  const [orientationId, setOrientationId] = useState("pintura");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [analyticFile, setAnalyticFile] = useState<File | null>(null);
  const [analyticMatches, setAnalyticMatches] = useState<ReviewRow[]>([]);
  const [analyticSummary, setAnalyticSummary] = useState<{ approved?: number; electives?: number; detected: number; warnings: string[] } | null>(null);
  const [analyticConfirmed, setAnalyticConfirmed] = useState(false);
  const actualActive = enrollments.find(row => row.isActive);
  const active = enrollments.find(row => row.id === selectedEnrollmentId) ?? actualActive;
  const activeProgram = programs.find(row => row.id === active?.programId);
  const activePlan = plans.find(row => row.id === active?.curriculumId);
  const activeOrientation = orientations.find(row => row.id === active?.orientationId);
  const visible = active ? subjectsForEnrollment(subjects, active) : [];
  const items = enrollmentHistoryItems(visible, historyRows);
  const history = Object.fromEntries(historyRows.map(row => [row.curriculum_subject_id, row.status])) as Record<string, Status>;
  const progress = active ? countKnownProgress(subjects, active, history) : null;
  const workshopCount = active ? countChoiceRequirement({ id: "complementarios", curriculumId: active.curriculumId, requiredCount: 4, pool: "complementary_workshops", excludeEnrollmentOrientation: true }, active,
    workshopHistory.filter(row => row.status === "passed").flatMap(row => { const option = workshopOptions.find(item => item.id === row.workshop_option_id && item.verification_status === "verified"); return option ? [{ subjectId: option.id, orientationId: option.orientation_id }] : []; })) : 0;

  async function reload() {
    const [programResult, planResult, orientationResult, enrollmentResult, subjectResult, workshopOptionResult] = await Promise.all([
      supabase.from("academic_programs").select("id,family,degree_type,name"),
      supabase.from("curricula").select("id,family,display_name,catalog_kind,requires_orientation,legacy_curriculum"),
      supabase.from("academic_orientations").select("id,family,name"),
      supabase.from("user_enrollments").select("id,program_id,curriculum_id,orientation_id,is_active").eq("user_id", userId),
      supabase.from("curriculum_subjects").select("id,curriculum_id,subject_id,official_code,official_name,year_level,degree_scope,orientation_condition,requirement_kind,review_status").order("year_level").order("official_name"),
      supabase.from("plastic_workshop_options").select("id,orientation_id,verification_status"),
    ]);
    const failed = [programResult, planResult, orientationResult, enrollmentResult, subjectResult].find(result => result.error);
    if (failed?.error) { setError(`No pudimos cargar las trayectorias (${failed.error.code}). Revisá que se hayan aplicado las migraciones académicas.`); return; }
    setPrograms((programResult.data ?? []) as Program[]);
    setPlans((planResult.data ?? []) as Plan[]);
    setOrientations((orientationResult.data ?? []) as Orientation[]);
    setEnrollments((enrollmentResult.data ?? []).map(row => ({ id: row.id, programId: row.program_id, curriculumId: row.curriculum_id, orientationId: row.orientation_id, degreeType: (programResult.data ?? []).find(program => program.id === row.program_id)?.degree_type ?? "licenciatura", isActive: row.is_active })));
    setSubjects((subjectResult.data ?? []).map(row => ({ id: row.id, curriculumId: row.curriculum_id, subjectId: row.subject_id, officialCode: row.official_code, officialName: row.official_name, yearLevel: row.year_level, degreeScope: row.degree_scope, orientationCondition: row.orientation_condition, requirementKind: row.requirement_kind, reviewStatus: row.review_status })) as CurriculumSubject[]);
    setWorkshopOptions((workshopOptionResult.data ?? []) as WorkshopOption[]);
    setWorkshopStorageReady(!workshopOptionResult.error);
    setReady(true);
  }

  useEffect(() => { void reload(); }, [supabase, userId]);
  useEffect(() => {
    setEditingSubjectId(null);
    setHistoryRows([]);
    setPendingRecords([]);
    setWorkshopHistory([]);
    if (!active) return;
    let cancelled = false;
    void supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status,grade,passed_at").eq("enrollment_id", active.id)
      .then(({ data, error }) => { if (cancelled) return; if (error) setError("No pudimos cargar tu historial de esta trayectoria."); else setHistoryRows((data ?? []) as EnrollmentHistory[]); });
    if (active.curriculumId.startsWith("plastica-")) void supabase.from("user_workshop_history").select("id,raw_name,status,grade,passed_at,workshop_option_id").eq("enrollment_id", active.id)
      .then(({ data, error }) => { if (cancelled) return; if (error) setWorkshopStorageReady(false); else setWorkshopHistory((data ?? []) as WorkshopHistory[]); });
    void supabase.from("user_pending_academic_records").select("id,raw_name,status,grade,passed_at,match_kind").eq("enrollment_id", active.id)
      .then(({ data, error }) => { if (!cancelled && !error) setPendingRecords((data ?? []) as PendingAcademicRecord[]); });
    return () => { cancelled = true; };
  }, [active?.id, supabase]);

  async function createEnrollment() {
    setBusy(true); setError("");
    try {
      const program = programs.find(row => row.id === programId);
      const plan = plans.find(row => row.id === planId);
      if (!program || !plan || program.family !== plan.family) throw new Error("Elegí un título y plan de la misma carrera.");
      const orientation = plan.requires_orientation ? orientationId : null;
      if (orientation && !orientations.some(row => row.id === orientation && row.family === program.family)) throw new Error("Elegí una orientación válida.");
      const existing = enrollments.find(row => row.programId === programId && row.curriculumId === planId && row.orientationId === orientation);
      let id = existing?.id;
      if (!id) {
        const { data, error: insertError } = await supabase.from("user_enrollments").insert({ user_id: userId, program_id: programId, curriculum_id: planId, orientation_id: orientation, is_active: false }).select("id").single();
        if (insertError || !data) throw new Error("No pudimos crear la trayectoria.");
        id = data.id;
      }
      if (!id) throw new Error("No pudimos identificar la trayectoria creada.");
      setSelectedEnrollmentId(id);
      await reload();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar la trayectoria."); }
    finally { setBusy(false); }
  }

  async function activate(id: string) {
    setBusy(true); setError("");
    const chosen = enrollments.find(row => row.id === id);
    const { error: activateError } = await supabase.rpc("activate_user_enrollment", { selected_id: id });
    if (activateError) setError("No pudimos cambiar de trayectoria.");
    else {
      try {
        const chosenPlan = plans.find(row => row.id === chosen?.curriculumId);
        if (chosen && chosenPlan?.catalog_kind === "legacy_subjects" && chosenPlan.legacy_curriculum) await saveAcademicProfile(supabase, chosen.degreeType, chosenPlan.legacy_curriculum);
        setSelectedEnrollmentId(id);
        await reload(); router.refresh();
      } catch { setError("La trayectoria se activó, pero no pudimos sincronizar el perfil anterior. Recargá y volvé a intentarlo."); }
    }
    setBusy(false);
  }

  async function saveStatus(subjectId: string) {
    if (!active) return;
    setBusy(true); setError("");
    try {
      const values = validateAcademicEdit(edit);
      const { data, error: saveError } = await supabase.from("user_enrollment_subjects").upsert({ enrollment_id: active.id, curriculum_subject_id: subjectId, ...values, updated_at: new Date().toISOString() }, { onConflict: "enrollment_id,curriculum_subject_id" }).select("curriculum_subject_id,status,grade,passed_at").single();
      if (saveError || !data) throw new Error("No pudimos guardar esta materia.");
      setHistoryRows(current => [...current.filter(row => row.curriculum_subject_id !== subjectId), data as EnrollmentHistory]);
      setEditingSubjectId(null);
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar esta materia."); }
    setBusy(false);
  }

  async function confirmPending(recordId: string) {
    const subjectId = pendingChoices[recordId];
    if (!active || !subjectId) { setError("Elegí una materia del plan para confirmar esta fila."); return; }
    setBusy(true); setError("");
    const { error: confirmError } = await supabase.rpc("confirm_pending_academic_record", { p_record_id: recordId, p_subject_id: subjectId });
    if (confirmError) setError("No pudimos confirmar esta materia. Verificá que corresponda a la trayectoria.");
    else {
      const [{ data: refreshed }, { data: pending }] = await Promise.all([
        supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status,grade,passed_at").eq("enrollment_id", active.id),
        supabase.from("user_pending_academic_records").select("id,raw_name,status,grade,passed_at,match_kind").eq("enrollment_id", active.id),
      ]);
      if (refreshed) setHistoryRows(refreshed as EnrollmentHistory[]);
      if (pending) setPendingRecords(pending as PendingAcademicRecord[]);
      router.refresh();
    }
    setBusy(false);
  }

  async function parseAnalytic() {
    if (!analyticFile || !active || activePlan?.catalog_kind !== "curriculum_subjects") return;
    setBusy(true); setError(""); setAnalyticMatches([]); setAnalyticSummary(null); setAnalyticConfirmed(false);
    try {
      const form = new FormData(); form.append("file", analyticFile);
      const response = await fetch("/api/parse-analitico", { method: "POST", body: form });
      const parsed = await response.json() as ParsedAnalytic & { error?: string };
      if (!response.ok) throw new Error(parsed.error ?? "No pudimos leer el analítico.");
      if (parsed.detectedProgramFamily && parsed.detectedProgramFamily !== activeProgram?.family) throw new Error("El documento parece corresponder a otra carrera.");
      if (parsed.detectedPlanYear && !active.curriculumId.endsWith(String(parsed.detectedPlanYear))) throw new Error("El plan detectado no coincide con la trayectoria activa.");
      if (parsed.detectedTitle && parsed.detectedTitle !== active.degreeType) throw new Error("El título detectado no coincide con la trayectoria activa.");
      if (parsed.detectedOrientation && parsed.detectedOrientation !== active.orientationId) throw new Error("La orientación detectada no coincide con la trayectoria activa.");
      if (!parsed.subjects.length) throw new Error("No encontramos materias en este analítico.");
      setAnalyticSummary({ approved: parsed.reportedApprovedCount, electives: parsed.reportedElectiveCount, detected: parsed.subjects.length, warnings: [
        ...parsed.warnings,
        ...(parsed.subjects.some(row => needsWorkshopOrientationReview(row.rawName)) ? ["Los talleres complementarios identificados por orientación necesitan revisión. Podés conservar su nombre real para cotejo académico; no los asignes a casilleros genéricos."] : []),
      ] });
      const { data: aliases, error: aliasError } = await supabase.from("curriculum_subject_aliases")
        .select("curriculum_subject_id,alias,verified").in("curriculum_subject_id", visible.map(row => row.id)).eq("verified", true);
      if (aliasError) throw new Error("No pudimos verificar los alias del plan. Recargá la página e intentá de nuevo.");
      setAnalyticMatches(matchAnalyticSubjects(parsed.subjects, visible.map(row => ({ id: row.id, nombre: row.officialName })),
        (aliases ?? []).map(row => ({ subject_id: row.curriculum_subject_id, alias: row.alias, verified: row.verified }))));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos leer el analítico."); }
    finally { setBusy(false); }
  }

  async function saveAnalytic() {
    if (!active || !analyticConfirmed) return;
    const selected = analyticMatches.filter(row => row.subjectId && !row.ignored);
    const workshops = analyticMatches.filter(row => row.workshopSelected && !row.ignored);
    const pending = analyticMatches.filter(row => !row.reviewed && !row.subjectId && !row.workshopSelected && !row.ignored);
    if (selected.some(row => needsWorkshopOrientationReview(row.rawName))) { setError("Guardá esos talleres como actividades reales para revisión o ignorá la fila; no los asignes a casilleros genéricos."); return; }
    if (new Set(selected.map(row => String(row.subjectId))).size !== selected.length) { setError("Una materia aparece dos veces. Resolvé esas filas primero."); return; }
    setBusy(true); setError("");
    const { error: saveError } = await supabase.rpc("save_enrollment_analytic_review", {
      p_enrollment_id: active.id,
      p_subjects: selected.map(row => ({ subject_id: String(row.subjectId), status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null })),
      p_workshops: workshops.map(row => ({ raw_name: row.rawName, status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null })),
      p_pending: pending.map(row => ({ raw_name: row.rawName, status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null, match_kind: row.kind })),
    });
    if (saveError) setError("No pudimos guardar las materias del analítico.");
    else { setAnalyticMatches([]); setAnalyticSummary(null); const [{ data: refreshed }, { data: workshopData }, { data: pendingData }] = await Promise.all([
      supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status,grade,passed_at").eq("enrollment_id", active.id),
      supabase.from("user_workshop_history").select("id,raw_name,status,grade,passed_at,workshop_option_id").eq("enrollment_id", active.id),
      supabase.from("user_pending_academic_records").select("id,raw_name,status,grade,passed_at,match_kind").eq("enrollment_id", active.id),
    ]); if (refreshed) setHistoryRows(refreshed as EnrollmentHistory[]); if (workshopData) setWorkshopHistory(workshopData as WorkshopHistory[]); if (pendingData) setPendingRecords(pendingData as PendingAcademicRecord[]); router.refresh(); }
    setBusy(false);
  }

  return <div className="space-y-6">
    {error && <p role="alert" className="card border-l-4 border-red-600">{error}</p>}
    {!ready && !error && <p className="card">Cargando trayectorias…</p>}
    <section className="card"><h2 className="font-display text-2xl font-black">Mis trayectorias</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{enrollments.map(row => <button key={row.id} type="button" disabled={busy} onClick={() => setSelectedEnrollmentId(row.id)} className={`min-h-12 border-2 border-ink p-3 text-left ${row.id === active?.id ? "bg-cronopios-pink" : "bg-white"}`}>
        <strong>{programs.find(program => program.id === row.programId)?.name ?? row.programId}</strong><span className="block text-sm">{orientations.find(orientation => orientation.id === row.orientationId)?.name ? `${orientations.find(orientation => orientation.id === row.orientationId)?.name} · ` : ""}{plans.find(plan => plan.id === row.curriculumId)?.display_name}</span>{row.isActive && <span className="text-xs font-bold">Trayectoria activa</span>}{row.id === active?.id && <span className="block text-xs">Viendo esta trayectoria</span>}
      </button>)}</div>
      {active && !active.isActive && <div className="mt-4"><p className="text-sm">Estás viendo una trayectoria inactiva. Consultarla o cargar materias no cambia tu trayectoria activa.</p><button type="button" disabled={busy} onClick={() => void activate(active.id)} className="button-primary mt-2">Activar esta trayectoria</button></div>}
      <h3 className="mt-6 font-bold">Agregar otra trayectoria</h3><div className="mt-2 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">Título<select className="input mt-1" value={programId} onChange={event => { const next = programs.find(row => row.id === event.target.value); setProgramId(event.target.value); if (plans.find(row => row.id === planId)?.family !== next?.family) { const matching = plans.find(row => row.family === next?.family); if (matching) setPlanId(matching.id); } }}><option value="">Elegir título</option>{programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="text-sm font-bold">Plan<select className="input mt-1" value={planId} onChange={event => setPlanId(event.target.value)}>{plans.filter(row => row.family === programs.find(program => program.id === programId)?.family).map(row => <option key={row.id} value={row.id}>{row.display_name}</option>)}</select></label>
        {plans.find(row => row.id === planId)?.requires_orientation && <label className="text-sm font-bold">Orientación<select className="input mt-1" value={orientationId} onChange={event => setOrientationId(event.target.value)}>{orientations.filter(row => row.family === plans.find(plan => plan.id === planId)?.family).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      </div><button type="button" disabled={busy || !ready} onClick={() => void createEnrollment()} className="button-secondary mt-4">Agregar trayectoria</button>
    </section>
    {active && activePlan?.catalog_kind === "curriculum_subjects" && <section><p className="eyebrow">{activeProgram?.name} · {activeOrientation?.name} · {activePlan.display_name}</p><h2 className="mt-2 font-display text-2xl font-black">Materias de mi plan</h2><p className="mt-2 text-sm text-ink/65">{progress?.completed} de {progress?.total} requisitos obligatorios conocidos aprobados. Los talleres y seminarios a elección se cuentan por separado; este número no es el porcentaje total del título.</p>
      <div className="card mt-4"><h3 className="font-bold">Talleres Complementarios</h3>{workshopStorageReady ? <><p className="text-sm">{workshopCount} de 4 orientaciones verificadas. {workshopHistory.filter(row => !row.workshop_option_id).length} talleres guardados pendientes de cotejo académico.</p>{workshopHistory.map(row => <p key={row.id} className="text-sm">{row.status === "passed" ? "✓" : "○"} {row.raw_name}{!row.workshop_option_id && <span className="text-ink/55"> · orientación por verificar</span>}{(row.grade != null || row.passed_at) && <span className="block text-ink/65">{academicHistoryDetail({ grade: row.grade, date: row.passed_at })}</span>}</p>)}</> : <p className="text-sm">El historial de talleres estará disponible cuando se aplique la actualización académica. No se muestran cifras de cumplimiento por ahora.</p>}</div>
      {pendingRecords.length > 0 && <section className="card mt-4"><h3 className="font-bold">Pendientes de confirmar · {pendingRecords.length}</h3><p className="mt-1 text-sm text-ink/65">Estas filas del analítico no cuentan como materias aprobadas hasta que las vincules con una materia del plan.</p><div className="mt-3 space-y-3">{pendingRecords.map(row => <div key={row.id} className="border-t border-ink/20 pt-3"><p className="font-bold">{row.raw_name}</p>{academicHistoryDetail({ grade: row.grade, date: row.passed_at }) && <p className="text-sm text-ink/65">{academicHistoryDetail({ grade: row.grade, date: row.passed_at })}</p>}<div className="mt-2 flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-sm">Materia del plan<select className="input mt-1" value={pendingChoices[row.id] ?? ""} onChange={event => setPendingChoices(current => ({ ...current, [row.id]: event.target.value }))}><option value="">Elegir materia</option>{visible.map(subject => <option key={subject.id} value={subject.id}>{subject.officialName}</option>)}</select></label><button type="button" disabled={busy || !pendingChoices[row.id]} className="button-secondary" onClick={() => void confirmPending(row.id)}>Revisar y confirmar</button></div></div>)}</div></section>}
      <div className="card mt-5"><h3 className="font-display text-xl font-black">Subir analítico</h3><p className="mt-1 text-sm text-ink/65">El documento se usa para buscar materias dentro de esta trayectoria. Confirmá título, orientación y plan antes de guardar.</p><input className="input mt-3" type="file" accept=".pdf,application/pdf" onChange={event => setAnalyticFile(event.target.files?.[0] ?? null)} /><button type="button" disabled={busy || !analyticFile} onClick={() => void parseAnalytic()} className="button-secondary mt-3">Revisar materias</button>
        {analyticSummary && <div className="mt-4 text-sm"><p>Detectamos {analyticSummary.detected} filas para revisar. El documento informa {analyticSummary.approved ?? "un número no identificado de"} asignaturas aprobadas{analyticSummary.electives !== undefined ? ` y ${analyticSummary.electives} créditos/optativas` : ""}.</p>{analyticSummary.warnings.map(warning => <p key={warning} className="mt-2 text-amber-900">{warning}</p>)}</div>}
        {analyticMatches.length > 0 && <div className="mt-5 space-y-3"><h4 className="font-bold">Revisión del analítico</h4><p className="text-sm text-ink/65">Las filas sin correspondencia quedan pendientes de confirmar y no se cuentan como aprobadas.</p>{analyticMatches.map((row, index) => <label key={`${row.rawName}-${index}`} className="block border-t border-ink/20 pt-3 text-sm"><span className="font-bold">{row.rawName}</span><span className="ml-2 text-xs">{row.kind}</span><select className="input mt-2" value={row.workshopSelected ? "__workshop" : row.subjectId ? String(row.subjectId) : row.ignored ? "__ignore" : ""} onChange={event => setAnalyticMatches(current => current.map((item, i) => i === index ? { ...item, subjectId: event.target.value && !event.target.value.startsWith("__") ? event.target.value : undefined, workshopSelected: event.target.value === "__workshop", ignored: event.target.value === "__ignore", reviewed: Boolean(event.target.value) } : item))}><option value="">Dejar pendiente de confirmar</option>{needsWorkshopOrientationReview(row.rawName) && workshopStorageReady && <option value="__workshop">Guardar taller real para revisión</option>}<option value="__ignore">Ignorar fila</option>{visible.map(subject => <option key={subject.id} value={subject.id}>{subject.officialName}</option>)}</select></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={analyticConfirmed} onChange={event => setAnalyticConfirmed(event.target.checked)} /> Confirmo que este analítico corresponde a {activeProgram?.name}, orientación {activeOrientation?.name}, {plans.find(row => row.id === active.curriculumId)?.display_name}.</label><button type="button" disabled={busy || !analyticConfirmed} onClick={() => void saveAnalytic()} className="button-primary">Guardar materias y pendientes</button></div>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar materias">{([ ["all", "Todas"], ["pending", "Pendientes"], ["in_progress", "Cursando"], ["regular", "Cursada aprobada"], ["passed", "Aprobadas"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className="filter-chip">{label}</button>)}</div>
      <div className="mt-5 space-y-7">{Array.from(new Set(items.map(item => item.yearLevel))).sort((a, b) => (a ?? 0) - (b ?? 0)).map(year => <section key={year}><h3 className="mb-3 inline-block border-b-4 border-lime font-display text-lg font-bold">Año {year}</h3><div className="space-y-3">{items.filter(item => item.yearLevel === year && (filter === "all" || item.status === filter)).map(item => {
        const subject = visible.find(row => row.id === item.subjectId)!;
        return <article key={item.id} className="card min-w-0"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-ink/55">{subject.officialCode ?? "Sin código"}</p><h4 className="font-bold [overflow-wrap:anywhere]">{item.displayName}</h4><p className="mt-1 text-sm font-semibold">{academicStatusLabel(item.status)}</p>{academicHistoryDetail(item) && <p className="text-sm text-ink/65">{academicHistoryDetail(item)}</p>}{subject.reviewStatus === "manual_review" && <p className="mt-1 text-xs text-ink/60">Correlatividades pendientes de revisión: consultar el plan oficial.</p>}</div><div className="flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={() => { setEditingSubjectId(item.id); setEdit({ status: item.status, grade: item.grade == null ? "" : String(item.grade), date: item.date ?? "" }); }}>Editar</button><Link className="button-secondary" href={`/dashboard/agenda?subject=${encodeURIComponent(item.id)}`}>Agregar a Mi agenda</Link></div></div>
          {editingSubjectId === item.id && <div className="mt-4 grid gap-3 border-t border-ink/20 pt-4 sm:grid-cols-3"><label className="text-sm font-bold">Estado<select className="input mt-1" value={edit.status} onChange={event => setEdit(current => ({ ...current, status: event.target.value as Status }))}><option value="pending">Sin cursar</option><option value="in_progress">Cursando</option><option value="regular">Cursada aprobada</option><option value="passed">Aprobada</option></select></label><label className="text-sm font-bold">Nota opcional<input className="input mt-1" type="number" min="1" max="10" step="0.1" value={edit.grade} onChange={event => setEdit(current => ({ ...current, grade: event.target.value }))} /></label><label className="text-sm font-bold">Fecha opcional<input className="input mt-1" type="date" value={edit.date} onChange={event => setEdit(current => ({ ...current, date: event.target.value }))} /></label><div className="flex flex-wrap gap-2 sm:col-span-3"><button type="button" disabled={busy} onClick={() => void saveStatus(item.id)} className="button-primary">{busy ? "Guardando…" : "Guardar"}</button><button type="button" disabled={busy} onClick={() => setEditingSubjectId(null)} className="button-secondary">Cancelar</button></div></div>}
        </article>;
      })}</div></section>)}</div>
    </section>}
    {active && activePlan?.catalog_kind === "legacy_subjects" && <p className="card">Tu historial se conserva en <Link href="/dashboard/recorrido" className="font-bold underline">Mi recorrido</Link>.</p>}
  </div>;
}
