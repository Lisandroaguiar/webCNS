import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, CircleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getPublishedAcademicEvents } from "@/lib/supabase/public-data";
import { subjectsForDegree } from "@/lib/academic/degree-catalog";
import { detectDegree } from "@/lib/academic/curriculum";
import { getCourseEligibility, type EligibilitySubject } from "@/lib/academic/course-eligibility";
import { AcademicDeadlineCard } from "@/components/dashboard/academic-deadline-card";
import { measureServerStep } from "@/lib/observability/performance";

type SavedSubject = {
  id: string | number;
  subject_id: number;
  status: string;
  grade: number | null;
  subject: { name: string } | { name: string }[] | null;
};

function subjectName(subject: SavedSubject["subject"]) {
  return Array.isArray(subject) ? subject[0]?.name : subject?.name;
}

export default async function DashboardPage() {
  const renderStartedAt = performance.now();
  const supabase = await createClient();
  const userPromise = getCurrentUser();
  const subjectsPromise = measureServerStep("subjects", () => supabase.from("subjects").select("id, name, code, year, curriculum"));
  const eventsPromise = measureServerStep("academic_events", getPublishedAcademicEvents);
  const user = await userPromise;
  const [{ data: profile }, { data: allSubjects }, { data: savedSubjects }, publicEvents] = await Promise.all([
    measureServerStep("profile", () => supabase.from("profiles").select("full_name, curriculum").eq("id", user?.id).maybeSingle()),
    subjectsPromise,
    measureServerStep("user_subjects", () => supabase.from("user_subjects").select("id, status, grade, subject_id, subject:subjects(name)").eq("user_id", user?.id)),
    eventsPromise
  ]);
  if (process.env.PERF_LOG === "1") console.info(JSON.stringify({ event: "server_timing", name: "dashboard-data", duration_ms: Math.round((performance.now() - renderStartedAt) * 10) / 10 }));
  const selectedCurriculum = profile?.curriculum === "new" ? "new" : "old";
  const curriculumSubjects = subjectsForDegree((allSubjects ?? []).filter(subject => subject.curriculum === selectedCurriculum), detectDegree(user?.user_metadata?.degree ?? "") ?? "licenciatura", selectedCurriculum);
  const totalSubjects = curriculumSubjects.length;
  const curriculumIds = curriculumSubjects.map(subject => subject.id);
  const rows = (savedSubjects ?? []).filter(subject => curriculumIds.includes(subject.subject_id)) as SavedSubject[];
  const available = getCourseEligibility({ subjects: (allSubjects ?? []) as EligibilitySubject[], userSubjects: (savedSubjects ?? []).map(item => ({ subject_id: item.subject_id, status: item.status })), curriculum: selectedCurriculum, degree: detectDegree(user?.user_metadata?.degree ?? "") ?? "licenciatura" }).filter(item => item.status === "available");
  const today = new Date().toISOString().slice(0, 10);
  const nextEvent = publicEvents.find(event => (event.ends_at ?? event.starts_at ?? "2999-12-31") >= today);
  const approved = rows.filter(subject => subject.status === "passed");
  const total = totalSubjects ?? 0;
  const progress = total ? Math.round((approved.length / total) * 100) : 0;
  const grades = approved
    .map(subject => subject.grade)
    .filter((grade): grade is number => typeof grade === "number");
  const average = grades.length
    ? (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(2)
    : "—";
  const displayName = profile?.full_name || user?.user_metadata?.nombre || "estudiante";

  return <>
    <header className="mb-8">
      <p className="eyebrow">Inicio</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-tight">Hola, {displayName} <span className="text-cronopios-magenta">✦</span></h1>
      <p className="mt-2 text-ink/55">Tu recorrido académico, fechas y herramientas para la facu.</p>
    </header>
    <section className="grid gap-5 md:grid-cols-[1.4fr_1fr_1fr]">
      <div className="card bg-white text-ink">
        <div className="flex items-start justify-between">
          <div><p className="text-sm font-bold uppercase tracking-wider text-ink/55">Avance de carrera</p><p className="mt-3 font-display text-6xl font-black text-cronopios-magenta">{progress}<span className="text-2xl text-ink">%</span></p></div>
          <BookOpen className="text-cronopios-magenta" />
        </div>
        <div className="mt-6 h-4 border-2 border-ink bg-cronopios-paper"><div className="h-full bg-cronopios-magenta transition-all" style={{ width: `${progress}%` }} /></div>
        <p className="mt-3 text-sm text-ink/60">{approved.length} de {total || "—"} materias aprobadas</p>
      </div>
      <div className="card"><p className="text-sm text-ink/50">Promedio general</p><p className="mt-3 font-display text-4xl font-bold">{average}</p><p className="mt-2 text-xs text-ink/50">Sobre materias aprobadas</p></div>
      <div className="card bg-sage"><p className="text-sm text-ink/60">Estado actual</p><p className="mt-3 font-display text-2xl font-bold">{approved.length ? "En marcha" : "Empecemos"}</p><p className="mt-2 text-sm text-ink/60">El plan tiene {total || "—"} materias</p></div>
    </section>
    <section className="mt-8 grid gap-5 md:grid-cols-2">
      <div className="card">
        <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">Últimas aprobadas</h2><Link href="/dashboard/recorrido" className="text-sm font-semibold text-coral">Ver todas <ArrowRight className="inline" size={15} /></Link></div>
        {approved.slice(0, 4).map(item => <div key={String(item.id)} className="mt-5 flex items-center justify-between border-b border-ink/10 pb-3"><div className="flex items-center gap-3"><CheckCircle2 className="text-sage" size={19} /><span>{subjectName(item.subject) || "Materia"}</span></div><span className="font-semibold">{item.grade ?? "—"}</span></div>)}
        {!approved.length && <p className="mt-6 text-sm text-ink/50">Todavía no cargaste materias aprobadas.</p>}
      </div>
      <AcademicDeadlineCard title={nextEvent?.title} detail={nextEvent ? `${nextEvent.starts_at ?? "Fecha a confirmar"}${nextEvent.ends_at ? ` — ${nextEvent.ends_at}` : ""}` : undefined} sourceLabel={nextEvent?.source_label} sourceUpdatedAt={nextEvent?.updated_at} />
    </section>
    <section className="card mt-8 border-2 border-ink bg-white">
      <p className="eyebrow">Ya podés cursar</p>
      {available.slice(0, 3).map(item => <p key={item.subject.id} className="mt-3 font-bold">✦ {item.subject.name}</p>)}
      <p className="mt-4 text-sm text-ink/60">{selectedCurriculum === "new" ? "Las reglas alternativas del Plan 2024 todavía requieren revisión manual." : !rows.length ? "Primero carguemos tu recorrido para calcular resultados útiles." : !available.length ? "Por ahora no encontramos nuevas materias habilitadas." : `${available.length} materias habilitadas según tu recorrido.`}</p>
      <Link href="/dashboard/disponibles" className="mt-4 inline-flex min-h-11 items-center font-bold text-cronopios-magenta underline">Ver todas <ArrowRight className="ml-1" size={16} /></Link>
    </section>
    {!rows.length && <div className="mt-5 flex items-center gap-3 rounded-2xl border border-coral/30 bg-coral/10 p-4 text-sm"><CircleAlert className="text-coral" size={20} /> Cargá tus materias desde <Link className="font-bold underline" href="/dashboard/recorrido">Mi recorrido</Link>.</div>}
  </>;
}
