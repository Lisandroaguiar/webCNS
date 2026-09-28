"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { subjectsForEnrollment, countKnownProgress, countChoiceRequirement, needsWorkshopOrientationReview, type CurriculumSubject, type Enrollment } from "@/lib/academic/multicarrera";
import { matchAnalyticSubjects, type MatchedAnalyticSubject } from "@/lib/academic/match-analytic-subjects";
import type { ParsedAnalytic } from "@/lib/academic/analytic-parser";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";

type Program = { id: string; family: string; degree_type: Enrollment["degreeType"]; name: string };
type Plan = { id: string; family: string; display_name: string; catalog_kind: "legacy_subjects" | "curriculum_subjects"; requires_orientation: boolean; legacy_curriculum: "old" | "new" | null };
type Orientation = { id: string; family: string; name: string };
type SavedEnrollment = Enrollment & { isActive: boolean };
type Status = "pending" | "regular" | "passed";
type ReviewRow = MatchedAnalyticSubject & { workshopSelected?: boolean };
type WorkshopHistory = { id: string; raw_name: string; status: Status; workshop_option_id: string | null };
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
  const [history, setHistory] = useState<Record<string, Status>>({});
  const [workshopHistory, setWorkshopHistory] = useState<WorkshopHistory[]>([]);
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
    if (!active) { setHistory({}); setWorkshopHistory([]); return; }
    void supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status").eq("enrollment_id", active.id)
      .then(({ data, error }) => { if (error) setError("No pudimos cargar tu historial de esta trayectoria."); else setHistory(Object.fromEntries((data ?? []).map(row => [row.curriculum_subject_id, row.status as Status]))); });
    if (active.curriculumId.startsWith("plastica-")) void supabase.from("user_workshop_history").select("id,raw_name,status,workshop_option_id").eq("enrollment_id", active.id)
      .then(({ data, error }) => { if (error) setWorkshopStorageReady(false); else setWorkshopHistory((data ?? []) as WorkshopHistory[]); });
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

  async function saveStatus(subjectId: string, status: Status) {
    if (!active) return;
    setBusy(true); setError("");
    const { error: saveError } = await supabase.from("user_enrollment_subjects").upsert({ enrollment_id: active.id, curriculum_subject_id: subjectId, status, updated_at: new Date().toISOString() }, { onConflict: "enrollment_id,curriculum_subject_id" });
    if (saveError) setError("No pudimos guardar esta materia.");
    else setHistory(current => ({ ...current, [subjectId]: status }));
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
      setAnalyticMatches(matchAnalyticSubjects(parsed.subjects, visible.map(row => ({ id: row.id, nombre: row.officialName }))));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos leer el analítico."); }
    finally { setBusy(false); }
  }

  async function saveAnalytic() {
    if (!active || !analyticConfirmed) return;
    if (analyticMatches.some(row => !row.reviewed)) { setError("Revisá cada fila sin coincidencia antes de guardar."); return; }
    const selected = analyticMatches.filter(row => row.subjectId && !row.ignored);
    const workshops = analyticMatches.filter(row => row.workshopSelected && !row.ignored);
    if (selected.some(row => needsWorkshopOrientationReview(row.rawName))) { setError("Guardá esos talleres como actividades reales para revisión o ignorá la fila; no los asignes a casilleros genéricos."); return; }
    if (new Set(selected.map(row => String(row.subjectId))).size !== selected.length) { setError("Una materia aparece dos veces. Resolvé esas filas primero."); return; }
    setBusy(true); setError("");
    if (workshops.length) {
      const { error: workshopError } = await supabase.from("user_workshop_history").upsert(workshops.map(row => ({ enrollment_id: active.id, raw_name: row.rawName, activity_kind: "complementary", status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null, source: "analytic", updated_at: new Date().toISOString() })), { onConflict: "enrollment_id,raw_name,activity_kind" });
      if (workshopError) { setError("No pudimos conservar los talleres reales del analítico."); setBusy(false); return; }
    }
    const { error: saveError } = selected.length ? await supabase.from("user_enrollment_subjects").upsert(selected.map(row => ({ enrollment_id: active.id, curriculum_subject_id: row.subjectId, status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null, updated_at: new Date().toISOString() })), { onConflict: "enrollment_id,curriculum_subject_id" }) : { error: null };
    if (saveError) setError("No pudimos guardar las materias del analítico.");
    else { setAnalyticMatches([]); setAnalyticSummary(null); setHistory(current => ({ ...current, ...Object.fromEntries(selected.map(row => [String(row.subjectId), row.status ?? "passed"])) })); if (workshops.length) { const { data } = await supabase.from("user_workshop_history").select("id,raw_name,status,workshop_option_id").eq("enrollment_id", active.id); setWorkshopHistory((data ?? []) as WorkshopHistory[]); } }
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
      <div className="card mt-4"><h3 className="font-bold">Talleres Complementarios</h3>{workshopStorageReady ? <><p className="text-sm">{workshopCount} de 4 orientaciones verificadas. {workshopHistory.filter(row => !row.workshop_option_id).length} talleres guardados pendientes de cotejo académico.</p>{workshopHistory.map(row => <p key={row.id} className="text-sm">{row.status === "passed" ? "✓" : "○"} {row.raw_name}{!row.workshop_option_id && <span className="text-ink/55"> · orientación por verificar</span>}</p>)}</> : <p className="text-sm">El historial de talleres estará disponible cuando se aplique la actualización académica. No se muestran cifras de cumplimiento por ahora.</p>}</div>
      <div className="card mt-5"><h3 className="font-display text-xl font-black">Subir analítico</h3><p className="mt-1 text-sm text-ink/65">El documento se usa para buscar materias dentro de esta trayectoria. Confirmá título, orientación y plan antes de guardar.</p><input className="input mt-3" type="file" accept=".pdf,application/pdf" onChange={event => setAnalyticFile(event.target.files?.[0] ?? null)} /><button type="button" disabled={busy || !analyticFile} onClick={() => void parseAnalytic()} className="button-secondary mt-3">Revisar materias</button>
        {analyticSummary && <div className="mt-4 text-sm"><p>Detectamos {analyticSummary.detected} filas para revisar. El documento informa {analyticSummary.approved ?? "un número no identificado de"} asignaturas aprobadas{analyticSummary.electives !== undefined ? ` y ${analyticSummary.electives} créditos/optativas` : ""}.</p>{analyticSummary.warnings.map(warning => <p key={warning} className="mt-2 text-amber-900">{warning}</p>)}</div>}
        {analyticMatches.length > 0 && <div className="mt-5 space-y-3"><h4 className="font-bold">Revisión del analítico</h4>{analyticMatches.map((row, index) => <label key={`${row.rawName}-${index}`} className="block border-t border-ink/20 pt-3 text-sm"><span className="font-bold">{row.rawName}</span><span className="ml-2 text-xs">{row.kind}</span><select className="input mt-2" value={row.workshopSelected ? "__workshop" : row.subjectId ? String(row.subjectId) : row.ignored ? "__ignore" : ""} onChange={event => setAnalyticMatches(current => current.map((item, i) => i === index ? { ...item, subjectId: event.target.value && !event.target.value.startsWith("__") ? event.target.value : undefined, workshopSelected: event.target.value === "__workshop", ignored: event.target.value === "__ignore", reviewed: Boolean(event.target.value) } : item))}><option value="">Elegir materia</option>{needsWorkshopOrientationReview(row.rawName) && workshopStorageReady && <option value="__workshop">Guardar taller real para revisión</option>}<option value="__ignore">Ignorar fila</option>{visible.map(subject => <option key={subject.id} value={subject.id}>{subject.officialName}</option>)}</select></label>)}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={analyticConfirmed} onChange={event => setAnalyticConfirmed(event.target.checked)} /> Confirmo que este analítico corresponde a {activeProgram?.name}, orientación {activeOrientation?.name}, {plans.find(row => row.id === active.curriculumId)?.display_name}.</label><button type="button" disabled={busy || !analyticConfirmed} onClick={() => void saveAnalytic()} className="button-primary">Guardar materias revisadas</button></div>}
      </div>
      <div className="mt-4 space-y-3">{visible.map(subject => <article key={subject.id} className="card flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs text-ink/55">{subject.yearLevel}.º año · {subject.officialCode ?? "Sin código"}</p><h3 className="font-bold">{subject.officialName}</h3>{subject.reviewStatus === "manual_review" && <p className="text-xs text-ink/60">Correlatividades pendientes de revisión: consultar el plan oficial.</p>}</div><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-bold">Estado<select className="input mt-1" disabled={busy} value={history[subject.id] ?? "pending"} onChange={event => void saveStatus(subject.id, event.target.value as Status)}><option value="pending">Pendiente</option><option value="regular">Cursada</option><option value="passed">Aprobada</option></select></label><Link className="button-secondary" href={`/dashboard/agenda?subject=${encodeURIComponent(subject.id)}`}>Agregar a Mi agenda</Link></div></article>)}</div>
    </section>}
    {active && activePlan?.catalog_kind === "legacy_subjects" && <p className="card">Tu historial se conserva en <Link href="/dashboard/recorrido" className="font-bold underline">Mi recorrido</Link>.</p>}
  </div>;
}
