import Link from "next/link";
import { SessionAwareShell } from "@/components/app-shell/session-aware-shell";
import { CatedrasDirectory } from "@/components/catedras-directory";
import { subjectsForEnrollment, type CurriculumSubject, type Enrollment } from "@/lib/academic/multicarrera";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function PublicCatedrasPage({ searchParams }: { searchParams?: { q?: string } }) {
  const user = await getCurrentUser();
  const supabase = user ? await createClient() : null;
  const profileResult = user && supabase
    ? await supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle()
    : null;
  const { data: active } = user && supabase ? await supabase.from("user_enrollments").select("id,program_id,curriculum_id,orientation_id").eq("user_id", user.id).eq("is_active", true).maybeSingle() : { data: null };
  const { data: activePlan } = active && supabase ? await supabase.from("curricula").select("catalog_kind").eq("id", active.curriculum_id).maybeSingle() : { data: null };
  const managedActive = activePlan?.catalog_kind === "curriculum_subjects";
  const curriculum = managedActive ? null : profileResult?.data?.curriculum ?? null;
  const { data: planSubjects } = user && supabase && curriculum ? await supabase.from("subjects").select("id,name").eq("curriculum", curriculum).order("name") : { data: null };
  const [{ data: activeProgram, error: programError }, { data: managedSubjects, error: managedSubjectsError }] = managedActive && active && supabase ? await Promise.all([
    supabase.from("academic_programs").select("degree_type").eq("id", active.program_id).maybeSingle(),
    supabase.from("curriculum_subjects").select("id,curriculum_id,subject_id,official_code,official_name,year_level,degree_scope,orientation_condition,requirement_kind,review_status").eq("curriculum_id", active.curriculum_id).order("official_name"),
  ]) : [{ data: null, error: null }, { data: null, error: null }];
  const catalog = (managedSubjects ?? []).map(row => ({ id: row.id, curriculumId: row.curriculum_id, subjectId: row.subject_id, officialCode: row.official_code, officialName: row.official_name, yearLevel: row.year_level, degreeScope: row.degree_scope, orientationCondition: row.orientation_condition, requirementKind: row.requirement_kind, reviewStatus: row.review_status })) as CurriculumSubject[];
  const visibleSubjects = active && activeProgram ? subjectsForEnrollment(catalog, {
    id: active.id, programId: active.program_id, curriculumId: active.curriculum_id,
    orientationId: active.orientation_id, degreeType: activeProgram.degree_type,
  } as Enrollment) : [];
  return <SessionAwareShell user={user}>
    <div className={user ? "" : "mx-auto max-w-6xl px-5 py-10 md:px-8"}>
      <p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="mt-2 font-display text-4xl font-black">Guía de cátedras</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Buscá materias, docentes, contactos y enlaces útiles. Tu cursada se organiza en Mi agenda.</p>
      {managedActive && <><p className="card mt-5 text-sm">Todavía no hay fichas de cátedras verificadas para esta trayectoria. Podés agregar sus materias a Mi agenda y cargar allí tus horarios y aulas personales.</p>{programError || managedSubjectsError ? <p role="alert" className="card mt-4">No pudimos cargar las materias de esta trayectoria. Intentá de nuevo.</p> : <div className="mt-6 grid gap-3 md:grid-cols-2">{visibleSubjects.map(subject => <article key={subject.id} className="card"><h2 className="font-display text-xl font-black">{subject.officialName}</h2><Link className="button-secondary mt-3 inline-flex" href={`/dashboard/agenda?subject=${encodeURIComponent(subject.id)}`}>Agregar a Mi agenda</Link></article>)}</div>}</>}
      {!managedActive && <div className="mt-8"><CatedrasDirectory planSubjects={(planSubjects ?? []).map(item => ({ id: String(item.id), name: item.name }))} initialQuery={searchParams?.q ?? ""} authenticated={Boolean(user)} /></div>}
    </div>
  </SessionAwareShell>;
}
