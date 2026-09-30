"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { subjectsForEnrollment, planSubjectsForEnrollment, isComplementaryWorkshopSlot, countKnownProgress, countChoiceRequirement, needsWorkshopOrientationReview, isNamedWorkshopActivity, type CurriculumSubject, type Enrollment } from "@/lib/academic/multicarrera";
import { matchAnalyticSubjects, type MatchedAnalyticSubject } from "@/lib/academic/match-analytic-subjects";
import { classifyPlasticAnalyticRows, partitionAnalyticReview } from "@/lib/academic/analytic-review";
import type { ParsedAnalytic } from "@/lib/academic/analytic-parser";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";
import { academicHistoryDetail, academicStatusLabel, enrollmentHistoryItems, validateAcademicEdit, type AcademicStatus } from "@/lib/academic/history-item";
import { AcademicSubjectCard, type SubjectCardStatus } from "@/components/academic/academic-subject-card";
import { SubjectDetailDialog } from "@/components/academic/subject-detail-dialog";

type Program = { id: string; family: string; degree_type: Enrollment["degreeType"]; name: string };
type Plan = { id: string; family: string; display_name: string; catalog_kind: "legacy_subjects" | "curriculum_subjects"; requires_orientation: boolean; legacy_curriculum: "old" | "new" | null };
type Orientation = { id: string; family: string; name: string };
type SavedEnrollment = Enrollment & { isActive: boolean; deletedAt: string | null };
type Status = AcademicStatus;
type ReviewRow = MatchedAnalyticSubject & { workshopSelected?: boolean; workshopOptionId?: string; manualOverride?: boolean };
type WorkshopHistory = { id: string; raw_name: string; status: Status; grade: number | null; passed_at: string | null; workshop_option_id: string | null; curriculum_subject_id: string | null };
type EnrollmentHistory = { curriculum_subject_id: string; status: Status; grade: number | null; passed_at: string | null };
type PendingAcademicRecord = { id: string; raw_name: string; status: Status; grade: number | null; passed_at: string | null; match_kind: string; record_type: "subject" | "workshop"; suggested_subject_id: string | null; resolution_status: "pending" | "ignored" | "confirmed" };
type WorkshopOption = { id: string; orientation_id: string; academic_name: string; siu_name: string | null; verification_status: string };

export function TrajectoryManager({ userId, reviewOnly = false, showManagement = true }: { userId: string; reviewOnly?: boolean; showManagement?: boolean }) {
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
  const [pendingDetailId, setPendingDetailId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ status: "pending" as Status, grade: "", date: "" });
  const [filter, setFilter] = useState<"all" | "pending" | "in_progress" | "regular" | "passed">("all");
  const [workshopHistory, setWorkshopHistory] = useState<WorkshopHistory[]>([]);
  const [workshopModalOpen, setWorkshopModalOpen] = useState(false);
  const [workshopForm, setWorkshopForm] = useState({ existingId: "", rawName: "", optionId: "", status: "passed" as Status, grade: "", date: "" });
  const [pendingRecords, setPendingRecords] = useState<PendingAcademicRecord[]>([]);
  const [pendingChoices, setPendingChoices] = useState<Record<string, string>>({});
  const [showIgnored, setShowIgnored] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replacementId, setReplacementId] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [enrollmentCounts, setEnrollmentCounts] = useState<Record<string, { subjects: number; workshops: number; pending: number }>>({});
  const [workshopOptions, setWorkshopOptions] = useState<WorkshopOption[]>([]);
  const [workshopStorageReady, setWorkshopStorageReady] = useState(false);
  const [programId, setProgramId] = useState("plastica-lic");
  const [planId, setPlanId] = useState("plastica-2006");
  const [orientationId, setOrientationId] = useState("pintura");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [analyticFile, setAnalyticFile] = useState<File | null>(null);
  const [analyticImportId, setAnalyticImportId] = useState<string | null>(null);
  const [analyticMatches, setAnalyticMatches] = useState<ReviewRow[]>([]);
  const [analyticSummary, setAnalyticSummary] = useState<{ approved?: number; electives?: number; detected: number; warnings: string[] } | null>(null);
  const [analyticConfirmed, setAnalyticConfirmed] = useState(false);
  const currentEnrollments = enrollments.filter(row => !row.deletedAt);
  const deletedEnrollments = enrollments.filter(row => row.deletedAt);
  const actualActive = currentEnrollments.find(row => row.isActive);
  const active = currentEnrollments.find(row => row.id === selectedEnrollmentId) ?? actualActive ?? currentEnrollments[0];
  const openPending = pendingRecords.filter(row => row.resolution_status === "pending");
  const openSubjectPending = openPending.filter(row => row.record_type !== "workshop");
  const openWorkshopPending = openPending.filter(row => row.record_type === "workshop");
  const ignoredPending = pendingRecords.filter(row => row.resolution_status === "ignored");
  const activeProgram = programs.find(row => row.id === active?.programId);
  const activePlan = plans.find(row => row.id === active?.curriculumId);
  const activeOrientation = orientations.find(row => row.id === active?.orientationId);
  const visible = active ? subjectsForEnrollment(subjects, active) : [];
  const planVisible = active ? planSubjectsForEnrollment(subjects, active) : [];
  const items = enrollmentHistoryItems(planVisible.filter(subject => !isComplementaryWorkshopSlot(subject)), historyRows);
  const history = Object.fromEntries(historyRows.map(row => [row.curriculum_subject_id, row.status])) as Record<string, Status>;
  const progress = active ? countKnownProgress(subjects, active, history) : null;
  const workshopCount = active ? countChoiceRequirement({ id: "complementarios", curriculumId: active.curriculumId, requiredCount: 4, pool: "complementary_workshops", excludeEnrollmentOrientation: true }, active,
    workshopHistory.filter(row => row.status === "passed").flatMap(row => { const option = workshopOptions.find(item => item.id === row.workshop_option_id && item.verification_status === "verified"); return option ? [{ subjectId: option.id, orientationId: option.orientation_id }] : []; })) : 0;
  const verifiedWorkshopOptions = workshopOptions.filter(option => option.verification_status === "verified" && option.orientation_id !== active?.orientationId);

  async function reload() {
    const [programResult, planResult, orientationResult, enrollmentResult, subjectResult, workshopOptionResult] = await Promise.all([
      supabase.from("academic_programs").select("id,family,degree_type,name"),
      supabase.from("curricula").select("id,family,display_name,catalog_kind,requires_orientation,legacy_curriculum"),
      supabase.from("academic_orientations").select("id,family,name"),
      supabase.from("user_enrollments").select("id,program_id,curriculum_id,orientation_id,is_active,deleted_at").eq("user_id", userId),
      supabase.from("curriculum_subjects").select("id,curriculum_id,subject_id,official_code,official_name,year_level,degree_scope,orientation_condition,requirement_kind,review_status").order("year_level").order("official_name"),
      supabase.from("plastic_workshop_options").select("id,orientation_id,academic_name,siu_name,verification_status"),
    ]);
    const failed = [programResult, planResult, orientationResult, enrollmentResult, subjectResult].find(result => result.error);
    if (failed?.error) { setError(`No pudimos cargar las trayectorias (${failed.error.code}). Revisá que se hayan aplicado las migraciones académicas.`); return; }
    setPrograms((programResult.data ?? []) as Program[]);
    setPlans((planResult.data ?? []) as Plan[]);
    setOrientations((orientationResult.data ?? []) as Orientation[]);
    setEnrollments((enrollmentResult.data ?? []).map(row => ({ id: row.id, programId: row.program_id, curriculumId: row.curriculum_id, orientationId: row.orientation_id, degreeType: (programResult.data ?? []).find(program => program.id === row.program_id)?.degree_type ?? "licenciatura", isActive: row.is_active, deletedAt: row.deleted_at })));
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
    if (active.curriculumId.startsWith("plastica-")) void supabase.from("user_workshop_history").select("id,raw_name,status,grade,passed_at,workshop_option_id,curriculum_subject_id").eq("enrollment_id", active.id)
      .then(({ data, error }) => { if (cancelled) return; if (error) setWorkshopStorageReady(false); else setWorkshopHistory((data ?? []) as WorkshopHistory[]); });
    void supabase.from("user_pending_academic_records").select("id,raw_name,status,grade,passed_at,match_kind,record_type,suggested_subject_id,resolution_status").eq("enrollment_id", active.id)
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
      const existing = currentEnrollments.find(row => row.programId === programId && row.curriculumId === planId && row.orientationId === orientation);
      if (!existing && deletedEnrollments.some(row => row.programId === programId && row.curriculumId === planId && row.orientationId === orientation)) throw new Error("Ya existe una trayectoria eliminada con ese título y plan. Restaurala desde la sección de abajo.");
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
        await reload();
        if (showManagement) router.push("/dashboard/recorrido");
        else router.refresh();
      } catch { setError("La trayectoria se activó, pero no pudimos sincronizar el perfil anterior. Recargá y volvé a intentarlo."); }
    }
    setBusy(false);
  }

  async function saveStatus(subjectId: string, nextEdit = edit) {
    if (!active) return;
    setBusy(true); setError("");
    try {
      const values = validateAcademicEdit(nextEdit);
      const { data, error: saveError } = await supabase.from("user_enrollment_subjects").upsert({ enrollment_id: active.id, curriculum_subject_id: subjectId, ...values, updated_at: new Date().toISOString() }, { onConflict: "enrollment_id,curriculum_subject_id" }).select("curriculum_subject_id,status,grade,passed_at").single();
      if (saveError || !data) throw new Error("No pudimos guardar esta materia.");
      setHistoryRows(current => [...current.filter(row => row.curriculum_subject_id !== subjectId), data as EnrollmentHistory]);
      setEditingSubjectId(null);
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar esta materia."); }
    setBusy(false);
  }

  async function saveWorkshop() {
    if (!active) return;
    setBusy(true); setError("");
    try {
      const option = verifiedWorkshopOptions.find(row => row.id === workshopForm.optionId);
      if (!option) throw new Error("Elegí un taller verificado.");
      const existing = workshopHistory.find(row => row.id === workshopForm.existingId);
      const rawName = (existing?.raw_name ?? option.siu_name ?? option.academic_name).trim();
      const values = validateAcademicEdit({ status: workshopForm.status, grade: workshopForm.grade, date: workshopForm.date });
      const payload = { enrollment_id: active.id, raw_name: rawName, activity_kind: "complementary", ...values,
        workshop_option_id: option.id, curriculum_subject_id: existing?.curriculum_subject_id ?? null, source: "manual", updated_at: new Date().toISOString() };
      const query = workshopForm.existingId
        ? supabase.from("user_workshop_history").update(payload).eq("id", workshopForm.existingId)
        : supabase.from("user_workshop_history").insert(payload);
      const { data, error: saveError } = await query.select("id,raw_name,status,grade,passed_at,workshop_option_id,curriculum_subject_id").single();
      if (saveError || !data) throw new Error("No pudimos guardar el taller. Revisá si ya está vinculado a otro requisito.");
      setWorkshopHistory(current => [...current.filter(row => row.id !== data.id), data as WorkshopHistory]);
      setWorkshopModalOpen(false);
      setWorkshopForm({ existingId: "", rawName: "", optionId: "", status: "passed", grade: "", date: "" });
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos guardar el taller."); }
    setBusy(false);
  }

  async function confirmPending(recordId: string, chosenSubjectId?: string) {
    const subjectId = chosenSubjectId ?? pendingChoices[recordId];
    if (!active || !subjectId) { setError("Elegí una materia del plan para confirmar esta fila."); return; }
    setBusy(true); setError("");
    const { error: confirmError } = await supabase.rpc("confirm_pending_academic_record", { p_record_id: recordId, p_subject_id: subjectId });
    if (confirmError) setError("No pudimos confirmar esta materia. Verificá que corresponda a la trayectoria.");
    else {
      const [{ data: refreshed }, { data: pending }] = await Promise.all([
        supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status,grade,passed_at").eq("enrollment_id", active.id),
        supabase.from("user_pending_academic_records").select("id,raw_name,status,grade,passed_at,match_kind,record_type,suggested_subject_id,resolution_status").eq("enrollment_id", active.id),
      ]);
      if (refreshed) setHistoryRows(refreshed as EnrollmentHistory[]);
      if (pending) setPendingRecords(pending as PendingAcademicRecord[]);
      router.refresh();
    }
    setBusy(false);
  }

  async function changePendingResolution(recordId: string, status: "pending" | "ignored") {
    setBusy(true); setError("");
    const { error: changeError } = await supabase.rpc("set_pending_academic_resolution", { p_record_id: recordId, p_status: status });
    if (changeError) setError("No pudimos actualizar esta fila. Intentá de nuevo.");
    else setPendingRecords(current => current.map(row => row.id === recordId ? { ...row, resolution_status: status } : row));
    setBusy(false);
  }

  async function prepareDelete(id: string) {
    setDeleteTarget(id); setDeleteConfirmation(""); setReplacementId(""); setError("");
    const [subjectsResult, workshopsResult, pendingResult] = await Promise.all([
      supabase.from("user_enrollment_subjects").select("curriculum_subject_id", { count: "exact", head: true }).eq("enrollment_id", id),
      supabase.from("user_workshop_history").select("id", { count: "exact", head: true }).eq("enrollment_id", id),
      supabase.from("user_pending_academic_records").select("id", { count: "exact", head: true }).eq("enrollment_id", id).eq("resolution_status", "pending"),
    ]);
    if (subjectsResult.error || pendingResult.error) { setError("No pudimos comprobar el contenido de la trayectoria."); setDeleteTarget(null); return; }
    setEnrollmentCounts(current => ({ ...current, [id]: { subjects: subjectsResult.count ?? 0, workshops: workshopsResult.count ?? 0, pending: pendingResult.count ?? 0 } }));
  }

  async function deleteEnrollment() {
    const target = currentEnrollments.find(row => row.id === deleteTarget);
    if (!target) return;
    const counts = enrollmentCounts[target.id];
    if (!counts) return;
    const hasHistory = counts.subjects + counts.workshops + counts.pending > 0;
    if (hasHistory && deleteConfirmation !== "ELIMINAR") return;
    if (target.isActive && currentEnrollments.length > 1 && !replacementId) return;
    setBusy(true); setError("");
    const { error: deleteError } = await supabase.rpc("soft_delete_user_enrollment", { p_enrollment_id: target.id, p_replacement_id: target.isActive ? replacementId || null : null });
    if (deleteError) setError("No pudimos eliminar esta trayectoria.");
    else {
      const replacement = currentEnrollments.find(row => row.id === replacementId);
      const replacementPlan = plans.find(row => row.id === replacement?.curriculumId);
      if (replacement && replacementPlan?.catalog_kind === "legacy_subjects" && replacementPlan.legacy_curriculum) {
        try { await saveAcademicProfile(supabase, replacement.degreeType, replacementPlan.legacy_curriculum); }
        catch { setError("La trayectoria se eliminó, pero no pudimos sincronizar el perfil anterior. Recargá la página."); }
      }
      setDeleteTarget(null); setSelectedEnrollmentId(target.isActive ? replacementId || null : null); await reload();
      if (currentEnrollments.length === 1) router.push("/dashboard/trayectorias");
      router.refresh();
    }
    setBusy(false);
  }

  async function restoreEnrollment(id: string) {
    setBusy(true); setError("");
    const { error: restoreError } = await supabase.rpc("restore_user_enrollment", { p_enrollment_id: id });
    if (restoreError) setError("No pudimos restaurar esta trayectoria.");
    else { await reload(); router.refresh(); }
    setBusy(false);
  }

  async function parseAnalytic() {
    if (!analyticFile || !active || activePlan?.catalog_kind !== "curriculum_subjects") return;
    setBusy(true); setError(""); setAnalyticMatches([]); setAnalyticSummary(null); setAnalyticConfirmed(false); setAnalyticImportId(null);
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
      setAnalyticImportId(crypto.randomUUID());
      setAnalyticSummary({ approved: parsed.reportedApprovedCount, electives: parsed.reportedElectiveCount, detected: parsed.subjects.length, warnings: [
        ...parsed.warnings,
        ...(parsed.subjects.some(row => needsWorkshopOrientationReview(row.rawName)) ? ["Los talleres complementarios identificados por orientación necesitan revisión. Podés conservar su nombre real para cotejo académico; no los asignes a casilleros genéricos."] : []),
      ] });
      const { data: aliases, error: aliasError } = await supabase.from("curriculum_subject_aliases")
        .select("curriculum_subject_id,alias,verified").in("curriculum_subject_id", visible.map(row => row.id)).eq("verified", true);
      if (aliasError) throw new Error("No pudimos verificar los alias del plan. Recargá la página e intentá de nuevo.");
      setAnalyticMatches(classifyPlasticAnalyticRows(matchAnalyticSubjects(parsed.subjects, visible.map(row => ({ id: row.id, nombre: row.officialName, requirementKind: row.requirementKind })),
        (aliases ?? []).map(row => ({ subject_id: row.curriculum_subject_id, alias: row.alias, verified: row.verified })),
        { curriculumId: active.curriculumId, orientationId: active.orientationId }), workshopOptions, active.orientationId));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "No pudimos leer el analítico."); }
    finally { setBusy(false); }
  }

  async function saveAnalytic() {
    if (!active || !analyticConfirmed) return;
    const { subjects: selected, workshops, pending } = partitionAnalyticReview(analyticMatches);
    if (selected.some(row => needsWorkshopOrientationReview(row.rawName))) { setError("Guardá esos talleres como actividades reales para revisión o ignorá la fila; no los asignes a casilleros genéricos."); return; }
    if (new Set(selected.map(row => String(row.subjectId))).size !== selected.length) { setError("Una materia aparece dos veces. Resolvé esas filas primero."); return; }
    setBusy(true); setError("");
    const { error: saveError } = await supabase.rpc("save_enrollment_analytic_review", {
      p_enrollment_id: active.id,
      p_subjects: selected.map(row => ({ subject_id: String(row.subjectId), raw_name: row.rawName, match_kind: row.manualOverride ? "MANUAL" : row.kind, source_reference: analyticImportId, status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null })),
      p_workshops: workshops.map(row => ({ raw_name: row.rawName, workshop_option_id: row.workshopOptionId ?? null, status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null })),
      p_pending: pending.map(row => ({ raw_name: row.rawName, status: row.status ?? "passed", grade: row.grade ?? null, passed_at: row.passedAt ?? null, match_kind: row.kind, suggested_subject_id: row.candidateId ?? row.candidateIds?.[0] ?? null, record_type: isNamedWorkshopActivity(row.rawName) ? "workshop" : "subject", resolution_status: row.ignored ? "ignored" : "pending", source_reference: analyticImportId })),
    });
    if (saveError) setError("No pudimos guardar las materias del analítico.");
    else { setAnalyticMatches([]); setAnalyticSummary(null); const [{ data: refreshed }, { data: workshopData }, { data: pendingData }] = await Promise.all([
      supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status,grade,passed_at").eq("enrollment_id", active.id),
      supabase.from("user_workshop_history").select("id,raw_name,status,grade,passed_at,workshop_option_id,curriculum_subject_id").eq("enrollment_id", active.id),
      supabase.from("user_pending_academic_records").select("id,raw_name,status,grade,passed_at,match_kind,record_type,suggested_subject_id,resolution_status").eq("enrollment_id", active.id),
    ]); if (refreshed) setHistoryRows(refreshed as EnrollmentHistory[]); if (workshopData) setWorkshopHistory(workshopData as WorkshopHistory[]); if (pendingData) setPendingRecords(pendingData as PendingAcademicRecord[]); router.push("/dashboard/recorrido"); router.refresh(); }
    setBusy(false);
  }

  if (reviewOnly) return <div className="space-y-5">
    {error && <p role="alert" className="card">{error}</p>}
    {!ready && <p className="card">Cargando materias para confirmar…</p>}
    {currentEnrollments.length > 1 && <label className="block text-sm font-bold">Trayectoria<select className="input mt-1" value={active?.id ?? ""} onChange={event => setSelectedEnrollmentId(event.target.value)}>{currentEnrollments.map(row => <option key={row.id} value={row.id}>{programs.find(program => program.id === row.programId)?.name} · {plans.find(plan => plan.id === row.curriculumId)?.display_name}</option>)}</select></label>}
    {ready && !openPending.length && <p className="card">No tenés materias para confirmar en esta trayectoria.</p>}
    {openPending.map(row => <article key={row.id} className="card min-w-0">
      <h2 className="font-display text-lg font-bold [overflow-wrap:anywhere]">{row.raw_name}</h2>
      {academicHistoryDetail({ grade: row.grade, date: row.passed_at }) && <p className="mt-1 text-sm text-ink/65">{academicHistoryDetail({ grade: row.grade, date: row.passed_at })}</p>}
      <p className="mt-2 text-sm">Necesita confirmación. Esta materia todavía no afecta tu recorrido.</p>
      {row.record_type === "workshop" ? <p className="mt-3 text-sm text-ink/65">Taller pendiente de cotejo de orientación. Todavía no suma al requisito.</p> : <label className="mt-3 block text-sm font-bold">Materia correspondiente<select className="input mt-1 min-w-0" value={pendingChoices[row.id] ?? row.suggested_subject_id ?? ""} onChange={event => setPendingChoices(current => ({ ...current, [row.id]: event.target.value }))}><option value="">Elegir materia</option>{visible.map(subject => <option key={subject.id} value={subject.id}>{subject.officialName}</option>)}</select></label>}
      <div className="mt-3 flex flex-wrap gap-2">
        {row.record_type !== "workshop" && <button type="button" className="button-primary" disabled={busy || !(pendingChoices[row.id] ?? row.suggested_subject_id)} onClick={() => void confirmPending(row.id, pendingChoices[row.id] ?? row.suggested_subject_id ?? undefined)}>Confirmar</button>}
        <button type="button" className="button-secondary" disabled={busy} onClick={() => void changePendingResolution(row.id, "ignored")}>Ignorar</button>
        <Link className="button-secondary" href="/dashboard/recorrido">Revisar después</Link>
      </div>
    </article>)}
    {ignoredPending.length > 0 && <details className="card"><summary className="cursor-pointer font-bold">Ver registros ignorados · {ignoredPending.length}</summary><div className="mt-3 space-y-3">{ignoredPending.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/20 pt-2"><span>{row.raw_name}</span><button type="button" className="button-secondary" disabled={busy} onClick={() => void changePendingResolution(row.id, "pending")}>Restaurar</button></div>)}</div></details>}
  </div>;

  return <div className="space-y-6">
    {error && <p role="alert" className="card border-l-4 border-red-600">{error}</p>}
    {!ready && !error && <p className="card">Cargando trayectorias…</p>}
    {showManagement && <section className="card"><h2 className="font-display text-2xl font-black">Mis trayectorias</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{currentEnrollments.map(row => <button key={row.id} type="button" disabled={busy} onClick={() => setSelectedEnrollmentId(row.id)} className={`min-h-12 border-2 border-ink p-3 text-left ${row.id === active?.id ? "bg-cronopios-pink" : "bg-white"}`}>
        <strong>{programs.find(program => program.id === row.programId)?.name ?? row.programId}</strong><span className="block text-sm">{orientations.find(orientation => orientation.id === row.orientationId)?.name ? `${orientations.find(orientation => orientation.id === row.orientationId)?.name} · ` : ""}{plans.find(plan => plan.id === row.curriculumId)?.display_name}</span>{row.isActive && <span className="text-xs font-bold">Trayectoria activa</span>}{row.id === active?.id && <span className="block text-xs">Viendo esta trayectoria</span>}
      </button>)}</div>
      {!currentEnrollments.length && <p className="mt-3 text-sm">No tenés trayectorias activas. Podés crear una nueva o restaurar una anterior.</p>}
      {active && !active.isActive && <div className="mt-4"><p className="text-sm">Estás viendo una trayectoria inactiva. Consultarla o cargar materias no cambia tu trayectoria activa.</p><button type="button" disabled={busy} onClick={() => void activate(active.id)} className="button-primary mt-2">Activar esta trayectoria</button></div>}
      {active && <button type="button" disabled={busy} onClick={() => void prepareDelete(active.id)} className="button-secondary mt-3">Eliminar esta trayectoria</button>}
      {deleteTarget && (() => { const target = currentEnrollments.find(row => row.id === deleteTarget); const counts = enrollmentCounts[deleteTarget]; const hasHistory = counts && counts.subjects + counts.workshops + counts.pending > 0; return target && <div role="dialog" aria-label="Eliminar trayectoria" className="mt-4 border-2 border-ink bg-white p-4"><h3 className="font-bold">¿Eliminar esta trayectoria?</h3><p className="mt-1 text-sm">{programs.find(row => row.id === target.programId)?.name} · {orientations.find(row => row.id === target.orientationId)?.name ? `${orientations.find(row => row.id === target.orientationId)?.name} · ` : ""}{plans.find(row => row.id === target.curriculumId)?.display_name}</p>{counts ? <p className="mt-2 text-sm">Contiene {counts.subjects} materias, {counts.workshops} talleres y {counts.pending} registros pendientes. Tus eventos personales independientes seguirán disponibles.</p> : <p>Cargando contenido…</p>}{hasHistory && <label className="mt-3 block text-sm">Para confirmar, escribí ELIMINAR<input className="input mt-1" value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} /></label>}{target.isActive && currentEnrollments.length > 1 && <label className="mt-3 block text-sm">Trayectoria que quedará activa<select className="input mt-1" value={replacementId} onChange={event => setReplacementId(event.target.value)}><option value="">Elegir trayectoria</option>{currentEnrollments.filter(row => row.id !== target.id).map(row => <option key={row.id} value={row.id}>{programs.find(program => program.id === row.programId)?.name} · {plans.find(plan => plan.id === row.curriculumId)?.display_name}</option>)}</select></label>}<div className="mt-4 flex flex-wrap gap-2"><button type="button" className="button-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button><button type="button" className="button-primary" disabled={busy || !counts || Boolean(hasHistory && deleteConfirmation !== "ELIMINAR") || Boolean(target.isActive && currentEnrollments.length > 1 && !replacementId)} onClick={() => void deleteEnrollment()}>Eliminar trayectoria</button></div></div>; })()}
      {deletedEnrollments.length > 0 && <details className="mt-4"><summary className="cursor-pointer font-bold">Trayectorias eliminadas · {deletedEnrollments.length}</summary><div className="mt-3 space-y-2">{deletedEnrollments.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/20 pt-2"><span>{programs.find(program => program.id === row.programId)?.name} · {orientations.find(orientation => orientation.id === row.orientationId)?.name ? `${orientations.find(orientation => orientation.id === row.orientationId)?.name} · ` : ""}{plans.find(plan => plan.id === row.curriculumId)?.display_name}</span><button type="button" disabled={busy} className="button-secondary" onClick={() => void restoreEnrollment(row.id)}>Restaurar</button></div>)}</div></details>}
      <h3 className="mt-6 font-bold">Agregar otra trayectoria</h3><div className="mt-2 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-bold">Título<select className="input mt-1" value={programId} onChange={event => { const next = programs.find(row => row.id === event.target.value); setProgramId(event.target.value); if (plans.find(row => row.id === planId)?.family !== next?.family) { const matching = plans.find(row => row.family === next?.family); if (matching) setPlanId(matching.id); } }}><option value="">Elegir título</option>{programs.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <label className="text-sm font-bold">Plan<select className="input mt-1" value={planId} onChange={event => setPlanId(event.target.value)}>{plans.filter(row => row.family === programs.find(program => program.id === programId)?.family).map(row => <option key={row.id} value={row.id}>{row.display_name}</option>)}</select></label>
        {plans.find(row => row.id === planId)?.requires_orientation && <label className="text-sm font-bold">Orientación<select className="input mt-1" value={orientationId} onChange={event => setOrientationId(event.target.value)}>{orientations.filter(row => row.family === plans.find(plan => plan.id === planId)?.family).map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
      </div><button type="button" disabled={busy || !ready} onClick={() => void createEnrollment()} className="button-secondary mt-4">Agregar trayectoria</button>
    </section>}
    {active && activePlan?.catalog_kind === "curriculum_subjects" && <section><p className="eyebrow">{activeProgram?.name} · {activeOrientation?.name} · {activePlan.display_name}</p><h2 className="mt-2 font-display text-2xl font-black">Materias de mi plan</h2><p className="mt-2 text-sm text-ink/65">{progress?.completed} de {progress?.total} requisitos obligatorios conocidos aprobados. Los talleres y seminarios a elección se cuentan por separado; este número no es el porcentaje total del título.</p>
      <div className="card mt-4">
        <h3 className="font-display text-xl font-bold">Talleres complementarios</h3>
        {workshopStorageReady ? <p className="mt-1 text-sm font-semibold">{Math.min(4, workshopCount)} de 4 realizados · Falta {Math.max(0, 4 - workshopCount)}</p> : <p className="mt-1 text-sm">El historial de talleres todavía no está disponible.</p>}
        <div className="mt-2 space-y-1 text-sm">{workshopHistory.filter(row => row.status === "passed").map(row => {
          const option = workshopOptions.find(item => item.id === row.workshop_option_id);
          return option?.verification_status === "verified" && option.orientation_id !== active.orientationId ? <p key={row.id}>✓ {option.academic_name}</p> : null;
        })}</div>
        <details className="mt-3"><summary className="cursor-pointer font-bold">Gestionar talleres</summary><div className="mt-3 space-y-2">{workshopHistory.map(row => {
          const option = workshopOptions.find(item => item.id === row.workshop_option_id);
          const counts = row.status === "passed" && option?.verification_status === "verified" && option.orientation_id !== active.orientationId;
          return <div key={row.id} className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-ink/15 pt-2 text-sm">
            <p className="min-w-0 [overflow-wrap:anywhere]"><span aria-hidden>{counts ? "✓ " : "○ "}</span><strong>{option?.academic_name ?? row.raw_name}</strong>{option && row.raw_name !== option.academic_name && <span className="block text-xs text-ink/60">{row.raw_name}</span>}{!counts && <span className="block text-xs text-ink/60">{option?.orientation_id === active.orientationId ? "Es tu orientación básica; no suma al requisito." : option ? academicStatusLabel(row.status) : "Pendiente de verificar orientación; todavía no suma."}</span>}{academicHistoryDetail({ grade: row.grade, date: row.passed_at }) && <span className="block text-xs text-ink/60">{academicHistoryDetail({ grade: row.grade, date: row.passed_at })}</span>}</p>
            {option && option.orientation_id !== active.orientationId && <button type="button" className="button-secondary" onClick={() => { setWorkshopForm({ existingId: row.id, rawName: row.raw_name, optionId: option.id, status: row.status, grade: row.grade == null ? "" : String(row.grade), date: row.passed_at ?? "" }); setWorkshopModalOpen(true); }}>Editar</button>}
          </div>;
        })}{openWorkshopPending.map(row => <p key={row.id} className="border-t border-ink/15 pt-2 text-sm">○ {row.raw_name} <span className="block text-xs text-ink/60">Pendiente de verificar orientación.</span></p>)}</div>
        <button type="button" className="button-secondary mt-4" disabled={!workshopStorageReady || !verifiedWorkshopOptions.length} onClick={() => { setWorkshopForm({ existingId: "", rawName: "", optionId: "", status: "passed", grade: "", date: "" }); setWorkshopModalOpen(true); }}>Agregar taller</button></details>
      </div>
      {workshopModalOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setWorkshopModalOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="workshop-dialog-title" onKeyDown={event => { if (event.key === "Escape" && !busy) setWorkshopModalOpen(false); }} className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border-2 border-ink bg-white p-5 shadow-[5px_5px_0_0_#000] sm:rounded-2xl">
          <h3 id="workshop-dialog-title" className="font-display text-xl font-black">{workshopForm.existingId ? "Editar taller" : "Agregar taller"}</h3>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-bold">Taller<select className="input mt-1" value={workshopForm.optionId} disabled={Boolean(workshopForm.existingId)} onChange={event => setWorkshopForm(current => ({ ...current, optionId: event.target.value }))}><option value="">Elegí un taller</option>{verifiedWorkshopOptions.map(option => <option key={option.id} value={option.id}>{option.academic_name}</option>)}</select></label>
            <label className="text-sm font-bold">Estado<select className="input mt-1" value={workshopForm.status} onChange={event => setWorkshopForm(current => ({ ...current, status: event.target.value as Status }))}><option value="passed">Aprobada</option><option value="regular">Cursada aprobada</option><option value="in_progress">Cursando</option><option value="pending">Sin completar</option></select></label>
            <label className="text-sm font-bold">Nota opcional<input className="input mt-1" type="number" min="1" max="10" step="0.1" value={workshopForm.grade} onChange={event => setWorkshopForm(current => ({ ...current, grade: event.target.value }))} /></label>
            <label className="text-sm font-bold">Fecha opcional<input className="input mt-1" type="date" value={workshopForm.date} onChange={event => setWorkshopForm(current => ({ ...current, date: event.target.value }))} /></label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={busy || !workshopForm.optionId} className="button-primary" onClick={() => void saveWorkshop()}>{busy ? "Guardando…" : "Guardar"}</button><button type="button" disabled={busy} className="button-secondary" onClick={() => setWorkshopModalOpen(false)}>Cancelar</button></div>
        </section>
      </div>}
      {openSubjectPending.length > 0 && <section className="card mt-4">
        <h3 className="font-bold">Pendientes de confirmar · {openSubjectPending.length}</h3>
        <p className="mt-1 text-sm text-ink/65">Podés revisarlos cuando quieras. Todavía no afectan el progreso ni las correlatividades.</p>
        <div className="mt-3 space-y-2">{openSubjectPending.map(row => <AcademicSubjectCard key={row.id} name={row.raw_name} status="review" grade={row.grade} onOpen={() => setPendingDetailId(row.id)} />)}</div><Link href="/dashboard/revisar-recorrido" className="mt-4 inline-block text-sm font-bold underline">Revisar todas</Link>
      </section>}
      {ignoredPending.length > 0 && <details className="card mt-4" open={showIgnored} onToggle={event => setShowIgnored(event.currentTarget.open)}><summary className="cursor-pointer font-bold">Ver registros ignorados · {ignoredPending.length}</summary><div className="mt-3 space-y-3">{ignoredPending.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink/20 pt-2"><span className="[overflow-wrap:anywhere]">{row.raw_name}</span><button type="button" disabled={busy} className="button-secondary" onClick={() => void changePendingResolution(row.id, "pending")}>Restaurar a pendientes</button></div>)}</div></details>}
      <div className="card mt-5"><h3 className="font-display text-xl font-black">Subir analítico</h3><p className="mt-1 text-sm text-ink/65">El documento se usa para buscar materias dentro de esta trayectoria. Confirmá título, orientación y plan antes de guardar.</p><input className="input mt-3" type="file" accept=".pdf,application/pdf" onChange={event => setAnalyticFile(event.target.files?.[0] ?? null)} /><button type="button" disabled={busy || !analyticFile} onClick={() => void parseAnalytic()} className="button-secondary mt-3">Revisar materias</button>
        {analyticSummary && <div className="mt-4 text-sm"><p>Analítico procesado: {analyticSummary.detected} materias detectadas. {analyticMatches.filter(row => row.subjectId && !row.ignored).length} reconocidas y {analyticMatches.filter(row => !row.subjectId && !row.workshopSelected && !row.ignored).length} necesitan confirmación.</p><p className="mt-1 text-ink/65">Podés guardar las reconocidas y revisar las demás después.</p>{analyticSummary.warnings.map(warning => <p key={warning} className="mt-2 text-amber-900">{warning}</p>)}</div>}
        {analyticMatches.length > 0 && <div className="mt-5 space-y-3"><label className="mb-3 flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={analyticConfirmed} onChange={event => setAnalyticConfirmed(event.target.checked)} /> <span>Confirmo que este analítico corresponde a {activeProgram?.name}, orientación {activeOrientation?.name}, {plans.find(plan => plan.id === active.curriculumId)?.display_name}.</span></label><div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !analyticConfirmed} onClick={() => void saveAnalytic()} className="button-primary">Guardar y ver mi recorrido</button><a href="#revisar-analitico" className="button-secondary">Revisar las {analyticMatches.filter(row => !row.subjectId && !row.workshopSelected && !row.ignored).length} ahora</a><Link href="/dashboard/recorrido" className="button-secondary">Volver a mi recorrido sin guardar</Link></div><div id="revisar-analitico"><h4 className="font-bold">Revisión del analítico</h4><p className="text-sm text-ink/65">No encontramos una coincidencia segura para algunas filas. Podés revisarlas después; todavía no afectan tu recorrido.</p>{analyticMatches.map((row, index) => <label key={`${row.rawName}-${index}`} className="block border-t border-ink/20 pt-3 text-sm"><span className="font-bold">{row.rawName}</span><span className="ml-2 text-xs text-ink/65">{row.workshopSelected ? "Taller real" : ["EXACT", "ALIAS", "CONTEXT"].includes(row.kind) ? "Reconocida" : "Necesita confirmación"}</span><select className="input mt-2" value={row.workshopSelected ? "__workshop" : row.subjectId ? String(row.subjectId) : row.ignored ? "__ignore" : ""} onChange={event => setAnalyticMatches(current => current.map((item, i) => i === index ? { ...item, subjectId: event.target.value && !event.target.value.startsWith("__") ? event.target.value : undefined, workshopSelected: event.target.value === "__workshop", workshopOptionId: event.target.value === "__workshop" ? item.workshopOptionId : undefined, ignored: event.target.value === "__ignore", reviewed: Boolean(event.target.value), manualOverride: true } : item))}><option value="">Dejar pendiente de confirmar</option>{needsWorkshopOrientationReview(row.rawName) && workshopStorageReady && <option value="__workshop">Guardar taller real</option>}<option value="__ignore">Ignorar fila</option>{visible.map(subject => <option key={subject.id} value={subject.id}>{subject.officialName}</option>)}</select></label>)}</div></div>}
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar materias">{([ ["all", "Todas"], ["pending", "Pendientes"], ["in_progress", "Cursando"], ["regular", "Cursada aprobada"], ["passed", "Aprobadas"] ] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className="filter-chip">{label}</button>)}</div>
      <div className="mt-5 space-y-7">{Array.from(new Set(items.map(item => item.yearLevel))).sort((a, b) => (a ?? 0) - (b ?? 0)).map(year => <section key={year}><h3 className="mb-3 inline-block border-b-4 border-lime font-display text-lg font-bold">Año {year}</h3><div className="space-y-3">{items.filter(item => item.yearLevel === year && (filter === "all" || item.status === filter)).map(item => {
        const cardStatus: SubjectCardStatus = item.status === "passed" ? "passed" : item.status === "regular" ? "regular" : item.status === "in_progress" ? "in_progress" : "pending";
        return <AcademicSubjectCard key={item.id} name={item.displayName} status={cardStatus} grade={item.grade} onOpen={() => { setEditingSubjectId(item.id); setEdit({ status: item.status, grade: item.grade == null ? "" : String(item.grade), date: item.date ?? "" }); }} />;
      })}</div></section>)}</div>
    </section>}
    {pendingDetailId && (() => {
      const row = openSubjectPending.find(item => item.id === pendingDetailId);
      if (!row) return null;
      return <SubjectDetailDialog title={row.raw_name} onClose={() => setPendingDetailId(null)}>
        <p className="text-sm font-bold">Necesita confirmación</p>
        {academicHistoryDetail({ grade: row.grade, date: row.passed_at }) && <p className="text-sm text-ink/65">{academicHistoryDetail({ grade: row.grade, date: row.passed_at })}</p>}
        <label className="block text-sm font-bold">Materia del plan<select className="input mt-1 w-full" value={pendingChoices[row.id] ?? row.suggested_subject_id ?? ""} onChange={event => setPendingChoices(current => ({ ...current, [row.id]: event.target.value }))}><option value="">Elegir materia</option>{visible.map(subject => <option key={subject.id} value={subject.id}>{subject.officialName}</option>)}</select></label>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !(pendingChoices[row.id] ?? row.suggested_subject_id)} className="button-primary" onClick={() => { void confirmPending(row.id, pendingChoices[row.id] ?? row.suggested_subject_id ?? undefined); setPendingDetailId(null); }}>Confirmar</button><button type="button" disabled={busy} className="button-secondary" onClick={() => { void changePendingResolution(row.id, "ignored"); setPendingDetailId(null); }}>Ignorar</button></div>
      </SubjectDetailDialog>;
    })()}
    {editingSubjectId && (() => {
      const item = items.find(row => row.id === editingSubjectId);
      if (!item) return null;
      const subject = planVisible.find(row => row.id === item.subjectId);
      return <SubjectDetailDialog title={item.displayName} onClose={() => setEditingSubjectId(null)}>
        <label className="block text-sm font-bold">Estado<select aria-label={`Estado de ${item.displayName}`} className="input mt-1 w-full" value={edit.status} onChange={event => setEdit(current => ({ ...current, status: event.target.value as Status }))}><option value="pending">Sin cursar</option><option value="in_progress">Cursando</option><option value="regular">Cursada aprobada</option><option value="passed">Aprobada</option></select></label>
        <label className="block text-sm font-bold">Nota opcional<input aria-label={`Nota de ${item.displayName}`} className="input mt-1 w-full" type="number" min="1" max="10" step="0.1" value={edit.grade} onChange={event => setEdit(current => ({ ...current, grade: event.target.value }))} /></label>
        <details><summary className="cursor-pointer text-sm font-bold">Más información</summary><label className="mt-3 block text-sm font-bold">Fecha opcional<input aria-label={`Fecha de ${item.displayName}`} className="input mt-1 w-full" type="date" value={edit.date} onChange={event => setEdit(current => ({ ...current, date: event.target.value }))} /></label>{subject?.reviewStatus === "manual_review" && <p className="mt-3 text-sm text-ink/65">Correlatividades pendientes de revisión: consultá el plan oficial.</p>}<Link className="mt-3 inline-block text-sm font-bold underline" href={`/dashboard/agenda?subject=${encodeURIComponent(item.id)}`}>Agregar a Mi agenda</Link></details>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button type="button" disabled={busy} onClick={() => void saveStatus(item.id)} className="button-primary w-full">{busy ? "Guardando…" : "Guardar cambios"}</button>
      </SubjectDetailDialog>;
    })()}
    {active && activePlan?.catalog_kind === "legacy_subjects" && <p className="card">Tu historial se conserva en <Link href="/dashboard/recorrido" className="font-bold underline">Mi recorrido</Link>.</p>}
  </div>;
}
