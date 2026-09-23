import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarRange, GraduationCap, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getPublishedAcademicEvents, getPublishedCommunityPosts } from "@/lib/supabase/public-data";
import { subjectsForDegree } from "@/lib/academic/degree-catalog";
import { detectDegree } from "@/lib/academic/curriculum";
import { getCourseEligibility, type EligibilitySubject } from "@/lib/academic/course-eligibility";
import { AcademicDeadlineCard } from "@/components/dashboard/academic-deadline-card";
import { measureServerStep } from "@/lib/observability/performance";
import { currentAcademicPeriod } from "@/lib/academic/weekly-schedule";
import { localDateKey, nextRelevantEvent, progressSummary, upcomingWeekMeetings, type DashboardMeeting } from "@/lib/academic/dashboard-summary";

type SavedSubject = { subject_id: number; status: string; grade: number | null };
type JoinedSchedule = DashboardMeeting & { id: number; end_time: string | null; subject_id: string | null };
const eventTypes: Record<string, string> = { course_registration: "Inscripción a cursadas", final_registration: "Inscripción a finales", final_exam_period: "Mesa de examen", semester_start: "Inicio de cuatrimestre", semester_end: "Fin de cuatrimestre", academic_break: "Receso académico", other: "Calendario académico" };
const shortDays: Record<string, string> = { Lunes: "Lun", Martes: "Mar", Miércoles: "Mié", Jueves: "Jue", Viernes: "Vie" };
function formatDate(value: string) { return new Date(`${value}T12:00:00Z`).toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "long" }); }

export default async function DashboardPage() {
  const renderStartedAt = performance.now();
  const supabase = await createClient();
  const userPromise = getCurrentUser();
  const subjectsPromise = measureServerStep("subjects", () => supabase.from("subjects").select("id,name,code,year,curriculum"));
  const eventsPromise = measureServerStep("academic_events", getPublishedAcademicEvents);
  const postsPromise = measureServerStep("community_posts", getPublishedCommunityPosts);
  const user = await userPromise;
  const [profileResult, subjectsResult, savedResult, publicEvents, selectionResult, customResult, posts] = await Promise.all([
    measureServerStep("profile", () => supabase.from("profiles").select("full_name,curriculum").eq("id", user?.id).maybeSingle()),
    subjectsPromise,
    measureServerStep("user_subjects", () => supabase.from("user_subjects").select("status,grade,subject_id").eq("user_id", user?.id)),
    eventsPromise,
    supabase.from("user_schedule_selections").select("course_schedule:course_schedules(id,subject_id,raw_subject_name,weekday,start_time,end_time,academic_year,semester,curriculum,status)").eq("user_id", user?.id),
    supabase.from("user_custom_schedule_slots").select("id,subject_id,subject_name,weekday,start_time,end_time,academic_year,semester").eq("user_id", user?.id),
    postsPromise,
  ]);
  if (process.env.PERF_LOG === "1") console.info(JSON.stringify({ event: "server_timing", name: "dashboard-data", duration_ms: Math.round((performance.now() - renderStartedAt) * 10) / 10 }));
  const profile = profileResult.data;
  const allSubjects = subjectsResult.data ?? [];
  const savedSubjects = (savedResult.data ?? []) as SavedSubject[];
  const curriculum = profile?.curriculum === "new" ? "new" : "old";
  const degree = detectDegree(user?.user_metadata?.degree ?? "") ?? "licenciatura";
  const curriculumSubjects = subjectsForDegree(allSubjects.filter(subject => subject.curriculum === curriculum), degree, curriculum);
  const curriculumIds = new Set(curriculumSubjects.map(subject => String(subject.id)));
  const rows = savedSubjects.filter(subject => curriculumIds.has(String(subject.subject_id)));
  const { approved, percent: progress, average } = progressSummary(rows, curriculumSubjects.length);
  const available = getCourseEligibility({ subjects: allSubjects as EligibilitySubject[], userSubjects: savedSubjects.map(item => ({ subject_id: item.subject_id, status: item.status })), curriculum, degree }).filter(item => item.status === "available");
  const period = currentAcademicPeriod();
  const official = (selectionResult.data ?? []).flatMap(item => { const raw = item.course_schedule; return raw ? [Array.isArray(raw) ? raw[0] : raw] : []; }) as JoinedSchedule[];
  const personal: DashboardMeeting[] = (customResult.data ?? []).filter(item => item.weekday && item.start_time).map(item => ({ raw_subject_name: item.subject_name, weekday: item.weekday, start_time: item.start_time, academic_year: item.academic_year, semester: item.semester, curriculum }));
  const week = upcomingWeekMeetings([...official, ...personal], period, curriculum);
  const today = localDateKey(new Date());
  const nextEvent = nextRelevantEvent(publicEvents, today);
  const highlights = posts.filter(post => !post.event_date || post.event_date.slice(0, 10) >= today).slice(0, 2);
  const displayName = profile?.full_name || user?.user_metadata?.nombre || "estudiante";
  return <div className="min-w-0 space-y-5 sm:space-y-6">
    <header className="pb-1"><p className="eyebrow">Inicio</p><h1 className="mt-2 font-display text-[clamp(1.9rem,8vw,2.75rem)] font-black leading-tight">Hola, {displayName} <span className="text-cronopios-magenta">✦</span></h1><p className="mt-2 text-sm text-ink/60">Tu facu, de un vistazo.</p></header>
    {nextEvent && <AcademicDeadlineCard title={nextEvent.event.title} eventType={eventTypes[nextEvent.event.event_type] ?? "Calendario académico"} detail={formatDate(nextEvent.date)} urgency={nextEvent.daysAway === 0 ? "Es hoy" : nextEvent.daysAway === 1 ? "Es mañana" : nextEvent.daysAway <= 7 ? `En ${nextEvent.daysAway} días` : undefined} sourceLabel={nextEvent.event.source_label} sourceUpdatedAt={nextEvent.event.updated_at} />}
    <section className="card bg-white" aria-labelledby="dashboard-recorrido"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">Tu recorrido</p><h2 id="dashboard-recorrido" className="mt-2 font-display text-[clamp(3.4rem,14vw,5rem)] font-black leading-none text-cronopios-magenta">{progress}<span className="text-2xl text-ink">%</span></h2></div><Link href="/dashboard/recorrido" className="inline-flex min-h-11 items-center gap-1 font-bold text-cronopios-magenta underline">Ver recorrido <ArrowRight size={16} /></Link></div><div className="mt-5 h-4 border-2 border-ink bg-cronopios-paper" role="progressbar" aria-label="Materias aprobadas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-cronopios-magenta" style={{ width: `${progress}%` }} /></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm"><p><strong>{approved} de {curriculumSubjects.length}</strong> materias aprobadas</p><p>Promedio <strong>{average}</strong></p></div></section>
    <section className="card bg-white" aria-labelledby="dashboard-disponibles"><p className="eyebrow">Ya podés cursar</p><h2 id="dashboard-disponibles" className="mt-2 font-display text-xl font-black">{available.length ? `${available.length} ${available.length === 1 ? "materia habilitada" : "materias habilitadas"}` : "Sin materias habilitadas por ahora"}</h2>{available.length ? <ul className="mt-3 space-y-1 text-sm">{available.slice(0, 3).map(item => <li key={item.subject.id}>• {item.subject.name}</li>)}</ul> : <p className="mt-2 text-sm text-ink/60">{curriculum === "new" ? "Las correlatividades de tu plan requieren revisión manual." : !rows.length ? "Cargá tus materias en Tu recorrido para consultar tus opciones." : "Consultá tu recorrido para ver qué te falta."}</p>}<Link href="/dashboard/disponibles" className="mt-3 inline-flex min-h-11 items-center gap-1 font-bold text-cronopios-magenta underline">Ver todas <ArrowRight size={16} /></Link></section>
    <section className="card bg-cronopios-paper" aria-labelledby="dashboard-semana"><p className="eyebrow">Mi semana</p><h2 id="dashboard-semana" className="sr-only">Próximas cursadas</h2>{week.length ? <ul className="mt-2 divide-y divide-ink/15">{week.map((item, index) => <li key={`${item.raw_subject_name}-${item.weekday}-${item.start_time}-${index}`} className="flex min-w-0 items-start gap-3 py-2 text-sm"><span className="shrink-0 font-mono font-bold">{shortDays[item.weekday ?? ""] ?? item.weekday} · {item.start_time?.slice(0, 5)}</span><span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{item.raw_subject_name}</span></li>)}</ul> : <p className="mt-2 text-sm text-ink/60">Tu semana todavía está vacía.</p>}<Link href="/dashboard/mi-semana" className="mt-2 inline-flex min-h-11 items-center gap-1 font-bold text-cronopios-magenta underline">{week.length ? "Ver semana" : "Armar mi semana"} <ArrowRight size={16} /></Link></section>
    <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-2 sm:grid-cols-4"><QuickLink href="/dashboard/recorrido" label="Recorrido" icon={<GraduationCap size={18} />} /><QuickLink href="/catedras" label="Cátedras" icon={<Search size={18} />} /><QuickLink href="/agenda" label="Agenda" icon={<CalendarDays size={18} />} /><QuickLink href="/dashboard/mi-semana" label="Mi semana" icon={<CalendarRange size={18} />} /></nav>
    <section className="pt-2" aria-labelledby="dashboard-cartelera"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">Comunidad</p><h2 id="dashboard-cartelera" className="mt-1 font-display text-2xl font-black">Cartelera Cronopios</h2></div><Link href="/cartelera" className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-cronopios-magenta underline">Ver toda la cartelera <ArrowRight size={16} /></Link></div>{highlights.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{highlights.map((post, index) => <article key={post.id} className={`relative min-w-0 border-2 border-ink ${index ? "bg-cronopios-green" : "bg-cronopios-pink"} p-4 shadow-[4px_4px_0_0_#221E21]`}><span aria-hidden className="absolute -top-2 left-6 h-4 w-16 -rotate-3 border border-ink/20 bg-white/70" /><p className="font-mono text-[11px] font-bold uppercase tracking-wide">{post.event_type}{post.event_date ? ` · ${formatDate(post.event_date.slice(0, 10))}` : ""}</p><h3 className="mt-2 font-display text-lg font-black [overflow-wrap:anywhere]">{post.title}</h3><p className="mt-2 line-clamp-2 text-sm text-ink/75">{post.body}</p></article>)}</div> : <p className="mt-2 text-sm text-ink/60">Pronto habrá nuevas actividades.</p>}</section>
  </div>;
}

function QuickLink({ href, label, icon }: { href: "/dashboard/recorrido" | "/catedras" | "/agenda" | "/dashboard/mi-semana"; label: string; icon: React.ReactNode }) {
  return <Link href={href} className="flex min-h-12 min-w-0 items-center gap-2 border-2 border-ink bg-white px-2 py-2 text-xs font-bold shadow-[2px_2px_0_0_#221E21] sm:text-sm">{icon}<span>{label}</span></Link>;
}
