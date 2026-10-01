import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { detectDegree } from "@/lib/academic/curriculum";
import { getCourseEligibility, type CourseEligibility, type EligibilitySubject } from "@/lib/academic/course-eligibility";
import { countChoiceRequirement, evaluateEnrollmentEligibility, type CurriculumSubject, type Enrollment } from "@/lib/academic/multicarrera";
import { resolveCodePrerequisites, type SourceCodePrerequisite } from "@/lib/academic/prerequisite-codes";

function CourseCard({ item }: { item: CourseEligibility }) {
  const label = item.status === "available" ? "Ya podés cursarla" : item.status === "blocked" ? `Te faltan ${item.missingRequirements.length} requisitos` : item.status === "unknown" ? "Revisión manual" : item.status === "in_progress" ? "Regularizada" : "Aprobada";
  return <details className="min-w-0 border-2 border-ink bg-white p-4 shadow-[4px_4px_0_0_#221E21] open:bg-cronopios-paper">
    <summary className="cursor-pointer list-none"><span className="status-badge">{label}</span><span className="mt-2 block font-display text-xl font-black">{item.subject.name}</span><span className="mt-2 block text-xs text-ink/55">Tocá para ver el detalle</span></summary>
    <div className="mt-4 border-t border-ink/20 pt-4 text-sm">
      {item.status === "available" && <p>Ya cumpliste todas las correlatividades registradas para cursarla.</p>}
      {item.status === "unknown" && <p>{item.reason}</p>}
      {item.requirements.length > 0 && <><p className="font-bold">Requisitos registrados</p><ul className="mt-2 space-y-1">{item.requirements.map(requirement => <li key={`${requirement.subjectId}-${requirement.kind}`}>{requirement.satisfied ? "✓" : "○"} {requirement.name} · {requirement.kind === "passed" ? "aprobada" : "regular o aprobada"}</li>)}</ul></>}
      {item.status === "blocked" && <p className="mt-3 font-bold">Todavía necesitás {item.missingRequirements.map(requirement => requirement.name).join(", ")}.</p>}
      {item.requiredBy.length > 0 && <p className="mt-4 text-ink/65">Es requisito para: {item.requiredBy.join(", ")}.</p>}
      {item.status === "available" && <div className="mt-4 flex flex-wrap gap-3"><Link href={`/dashboard/agenda?subject=${encodeURIComponent(String(item.subject.id))}`} className="button-primary">Agregar a Mi agenda</Link><Link href={`/catedras?q=${encodeURIComponent(item.subject.name)}`} className="button-secondary">Ver cátedra</Link></div>}
    </div>
  </details>;
}

export default async function DisponiblesPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para ver tu recorrido.</p>;
  const supabase = await createClient();
  const { data: active } = await supabase.from("user_enrollments").select("id,program_id,curriculum_id,orientation_id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
  if (!active) return <div className="card"><h1 className="font-display text-2xl font-black">Qué podés cursar</h1><p className="mt-2">Elegí una trayectoria para ver las materias disponibles de ese plan.</p><Link href="/dashboard/trayectorias" className="button-primary mt-4 inline-flex">Elegir trayectoria</Link></div>;
  const { data: activePlan } = active ? await supabase.from("curricula").select("catalog_kind,display_name").eq("id", active.curriculum_id).maybeSingle() : { data: null };
  if (active && activePlan?.catalog_kind === "curriculum_subjects") {
    const { count: pendingCount } = await supabase.from("user_pending_academic_records").select("id", { count: "exact", head: true }).eq("enrollment_id", active.id).eq("resolution_status", "pending");
    const [{ data: program }, { data: rawSubjects }, ruleResult, requirementResult, { data: history }, { data: rollout }, workshopResult, optionResult] = await Promise.all([
      supabase.from("academic_programs").select("name,degree_type").eq("id", active.program_id).single(),
      supabase.from("curriculum_subjects").select("id,curriculum_id,subject_id,official_code,official_name,year_level,degree_scope,orientation_condition,requirement_kind,review_status").eq("curriculum_id", active.curriculum_id).order("year_level"),
      supabase.from("curriculum_prerequisite_rules").select("id,curriculum_id,target_code,required_code,purpose,required_status,required_count,source,source_review_required,resolution_status").eq("curriculum_id", active.curriculum_id),
      supabase.from("curriculum_requirements").select("id,curriculum_id,required_count,pool,exclude_enrollment_orientation").eq("curriculum_id", active.curriculum_id),
      supabase.from("user_enrollment_subjects").select("curriculum_subject_id,status").eq("enrollment_id", active.id),
      supabase.from("curriculum_rollout").select("year_level,available_from").eq("curriculum_id", active.curriculum_id),
      supabase.from("user_workshop_history").select("workshop_option_id,status").eq("enrollment_id", active.id),
      supabase.from("plastic_workshop_options").select("id,orientation_id,verification_status"),
    ]);
    if (!program || !rawSubjects || ruleResult.error || requirementResult.error || workshopResult.error || optionResult.error) return <p className="card">No pudimos cargar las correlatividades de esta trayectoria. Intentá de nuevo.</p>;
    const enrollment: Enrollment = { id: active.id, programId: active.program_id, curriculumId: active.curriculum_id, orientationId: active.orientation_id, degreeType: program.degree_type };
    const subjects = rawSubjects.map(row => ({ id: row.id, curriculumId: row.curriculum_id, subjectId: row.subject_id, officialCode: row.official_code, officialName: row.official_name, yearLevel: row.year_level, degreeScope: row.degree_scope, orientationCondition: row.orientation_condition, requirementKind: row.requirement_kind, reviewStatus: row.review_status })) as CurriculumSubject[];
    const requirements = (requirementResult.data ?? []).map(row => ({ id: row.id, curriculumId: row.curriculum_id, requiredCount: row.required_count, pool: row.pool, excludeEnrollmentOrientation: row.exclude_enrollment_orientation }));
    const prerequisites = resolveCodePrerequisites({ enrollment, subjects, requirements, rules: (ruleResult.data ?? []).map(row => ({ id: row.id, curriculumId: row.curriculum_id, targetCode: row.target_code, requiredCode: row.required_code, purpose: row.purpose, requiredStatus: row.required_status, requiredCount: row.required_count, source: row.source, manualReview: row.source_review_required, storedResolutionStatus: row.resolution_status })) as SourceCodePrerequisite[] });
    const workshopRequirement = requirements.find(row => row.pool === "complementary_workshops");
    const workshopCount = workshopRequirement ? countChoiceRequirement(workshopRequirement, enrollment, (workshopResult.data ?? []).filter(row => row.status === "passed").flatMap(row => { const option = (optionResult.data ?? []).find(item => item.id === row.workshop_option_id && item.verification_status === "verified"); return option ? [{ subjectId: option.id, orientationId: option.orientation_id }] : []; })) : 0;
    const result = evaluateEnrollmentEligibility({ enrollment, subjects, prerequisites, workshopCount, history: Object.fromEntries((history ?? []).map(row => [row.curriculum_subject_id, row.status])), currentYear: new Date().getFullYear(), rollout: Object.fromEntries((rollout ?? []).map(row => [row.year_level, row.available_from])) });
    return <div><p className="eyebrow">{program.name} · {activePlan.display_name}</p><h1 className="mt-3 font-display text-4xl font-black">Qué podés cursar</h1><p className="mt-3 text-sm text-ink/70">Algunas correlatividades de este plan todavía requieren revisión. Las materias pendientes aparecen como revisión manual; no asumimos equivalencias entre planes ni orientaciones.</p>{Boolean(pendingCount) && <p className="mt-3 text-sm text-ink/65">Tenés información de tu recorrido pendiente de confirmar. <Link href="/dashboard/revisar-recorrido" className="font-bold underline">Revisar</Link></p>}<div className="mt-7 grid gap-3 md:grid-cols-2">{result.map(row => <article key={row.subject.id} className="card"><span className="status-badge">{row.status === "available" ? "Disponible según reglas verificadas" : row.status === "blocked" ? "Faltan correlativas" : row.status === "completed" ? "Aprobada" : row.status === "in_progress" ? "Cursada" : "Revisión manual"}</span><h2 className="mt-2 font-display text-xl font-black">{row.subject.officialName}</h2><p className="mt-1 text-xs text-ink/60">{row.subject.yearLevel}.º año · {row.subject.officialCode}</p>{row.status === "unknown" && <p className="mt-2 text-sm">{row.reason}</p>}{row.status === "blocked" && <p className="mt-2 text-sm">Requisitos pendientes: {row.missing.length}.</p>}<Link href={`/dashboard/agenda?subject=${encodeURIComponent(row.subject.id)}`} className="button-secondary mt-3 inline-flex">Agregar a Mi agenda</Link></article>)}</div></div>;
  }
  const [{ data: profile, error: profileError }, { data: subjects, error: subjectsError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    supabase.from("subjects").select("id,name,code,year,curriculum").order("year").order("name"),
    supabase.from("user_subjects").select("subject_id,status").eq("user_id", user.id),
  ]);
  if (profileError || subjectsError || historyError) return <p className="card">No pudimos cargar el plan. Intentá de nuevo en unos minutos.</p>;
  const degree = detectDegree(user.user_metadata?.degree ?? "");
  if (!profile?.curriculum || !degree) return <div className="card"><p>Primero elegí tu carrera y plan para consultar las materias disponibles.</p><Link href="/dashboard/perfil" className="mt-3 inline-block font-bold underline">Ir a Perfil</Link></div>;
  const curriculum = profile?.curriculum === "new" ? "new" : "old";
  const results = getCourseEligibility({ subjects: (subjects ?? []) as EligibilitySubject[], userSubjects: history ?? [], curriculum, degree });
  for (const item of results.filter(item => item.reasonCode === "missing_requirement")) console.warn("course_eligibility_missing_requirement", { curriculum, subjectCode: item.subject.code });
  const available = results.filter(item => item.status === "available");
  const near = results.filter(item => item.status === "blocked" && item.missingRequirements.length === 1);
  const blocked = results.filter(item => item.status === "blocked" && item.missingRequirements.length > 1);
  const unknown = results.filter(item => item.status === "unknown");
  return <div className="min-w-0">
    <p className="eyebrow">Plan {curriculum === "old" ? "2006" : "2024"} · {degree === "profesorado" ? "Profesorado" : "Licenciatura"}</p>
    <h1 className="mt-3 font-display text-4xl font-black">Qué podés cursar</h1>
    <p className="mt-3 text-ink/70">Según las materias que cargaste y las correlatividades registradas en Mesita.</p>
    <p className="mt-2 text-sm text-ink/60">Usalo como orientación y verificá siempre las condiciones vigentes de tu plan. Si te falta cargar una materia, este resultado puede cambiar.</p>
    {!history?.length ? <div className="card mt-8"><p className="font-bold">Primero carguemos tu recorrido.</p><Link href="/dashboard/recorrido" className="mt-3 inline-block font-bold underline">Ir a Recorrido</Link></div> : results.length > 0 && results.every(item => item.status === "completed") ? <p className="card mt-8">Ya completaste todas las materias registradas de este plan.</p> : <>
      <section className="mt-8"><h2 className="font-display text-2xl font-black">Disponibles ahora</h2><p className="mt-1 text-sm text-ink/60">{available.length} {available.length === 1 ? "materia habilitada" : "materias habilitadas"} con los datos actuales.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{available.map(item => <CourseCard key={item.subject.id} item={item} />)}{!available.length && <p className="card">No encontramos materias nuevas habilitadas con el recorrido actual.</p>}</div></section>
      {near.length > 0 && <section className="mt-10"><h2 className="font-display text-2xl font-black">Te falta poco</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{near.map(item => <CourseCard key={item.subject.id} item={item} />)}</div></section>}
      {blocked.length > 0 && <details className="mt-10"><summary className="cursor-pointer font-display text-2xl font-black">Todavía bloqueadas · {blocked.length}</summary><div className="mt-4 grid gap-4 md:grid-cols-2">{blocked.map(item => <CourseCard key={item.subject.id} item={item} />)}</div></details>}
      {unknown.length > 0 && <section className="mt-10"><h2 className="font-display text-2xl font-black">Para revisar</h2><p className="mt-2 text-sm text-ink/60">Hay materias cuyas reglas todavía necesitamos revisar manualmente.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{unknown.map(item => <CourseCard key={item.subject.id} item={item} />)}</div></section>}
    </>}
  </div>;
}
