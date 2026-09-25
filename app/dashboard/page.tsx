import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarRange, GraduationCap, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getPublishedAcademicEvents, getPublishedCommunityPosts } from "@/lib/supabase/public-data";
import { subjectsForDegree } from "@/lib/academic/degree-catalog";
import { detectDegree } from "@/lib/academic/curriculum";
import { getCourseEligibility, type EligibilitySubject } from "@/lib/academic/course-eligibility";
import { measureServerStep } from "@/lib/observability/performance";
import { currentAcademicPeriod, type WeekSchedule } from "@/lib/academic/weekly-schedule";
import { localDateKey, nextRelevantEvent, progressSummary } from "@/lib/academic/dashboard-summary";
import { agendaItemsForDate, datePlusDays, sortAgendaItems, type PersonalEvent } from "@/lib/academic/personal-calendar";
import type { CustomWeekSlot } from "@/lib/academic/custom-week";
import { FdaHomeHero, FdaPlate } from "@/components/identity/fda-identity";

type SavedSubject = { subject_id: number; status: string; grade: number | null };
function formatDate(value: string) { return new Date(`${value}T12:00:00Z`).toLocaleDateString("es-AR", { timeZone: "UTC", day: "numeric", month: "long" }); }

export default async function DashboardPage() {
  const renderStartedAt = performance.now();
  const supabase = await createClient();
  const userPromise = getCurrentUser();
  const subjectsPromise = measureServerStep("subjects", () => supabase.from("subjects").select("id,name,code,year,curriculum"));
  const eventsPromise = measureServerStep("academic_events", getPublishedAcademicEvents);
  const postsPromise = measureServerStep("community_posts", getPublishedCommunityPosts);
  const user = await userPromise;
  const [profileResult, subjectsResult, savedResult, publicEvents, selectionResult, customResult, personalResult, posts] = await Promise.all([
    measureServerStep("profile", () => supabase.from("profiles").select("full_name,curriculum").eq("id", user?.id).maybeSingle()),
    subjectsPromise,
    measureServerStep("user_subjects", () => supabase.from("user_subjects").select("status,grade,subject_id").eq("user_id", user?.id)),
    eventsPromise,
    supabase.from("user_schedule_selections").select("course_schedule:course_schedules(id,subject_id,raw_subject_name,weekday,start_time,end_time,commission,classroom,campus,academic_year,semester,curriculum,status)").eq("user_id", user?.id),
    supabase.from("user_custom_schedule_slots").select("id,subject_id,subject_name,weekday,start_time,end_time,classroom,location,commission,source_schedule_id,academic_year,semester").eq("user_id", user?.id),
    supabase.from("user_calendar_events").select("id,title,event_date,start_time,end_time,location,notes,category,recurrence_type").eq("user_id", user?.id).or(`event_date.gte.${localDateKey(new Date())},recurrence_type.eq.weekly`).limit(500),
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
  const official = (selectionResult.data ?? []).flatMap(item => { const raw = item.course_schedule; return raw ? [Array.isArray(raw) ? raw[0] : raw] : []; }) as WeekSchedule[];
  const manual = (customResult.data ?? []) as CustomWeekSlot[];
  const personal = (personalResult.data ?? []) as PersonalEvent[];
  const today = localDateKey(new Date());
  const nextEvent = nextRelevantEvent(publicEvents, today);
  const upcoming = sortAgendaItems(Array.from({ length: 7 }, (_, index) => agendaItemsForDate(datePlusDays(today, index), { official, manual, personal, fda: publicEvents, period, curriculum })).flat());
  if (nextEvent && !upcoming.some(item => item.kind === "fda" && item.id === nextEvent.event.id && item.date === nextEvent.date)) upcoming.push({ key: `fda-${nextEvent.event.id}-${nextEvent.date}`, kind: "fda", title: nextEvent.event.title, date: nextEvent.date, start_time: null, end_time: null, id: nextEvent.event.id });
  const nextItems = sortAgendaItems(upcoming).slice(0, 3);
  const highlights = posts.filter(post => !post.event_date || post.event_date.slice(0, 10) >= today).slice(0, 2);
  const storedName = profile?.full_name?.trim();
  const displayName = storedName && storedName !== "Estudiante" ? storedName :
    user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.user_metadata?.name || "estudiante";
  return <div className="min-w-0 space-y-5 sm:space-y-6">
    <FdaHomeHero name={displayName} />
    <div className="dashboard-primary-grid"><section className="card dashboard-progress" aria-labelledby="dashboard-recorrido"><div className="dashboard-progress__top"><div><p className="dashboard-section-index">01 / TRAYECTO</p><h2 id="dashboard-recorrido" className="dashboard-section-title">Tu recorrido</h2></div><span aria-hidden className="dashboard-progress__route">● · · ● · · ◎</span></div><div className="dashboard-progress__body"><p className="dashboard-progress__number">{progress}<span>%</span></p><div className="dashboard-progress__detail"><p><strong>{approved} de {curriculumSubjects.length}</strong> materias aprobadas</p><p>Promedio <strong>{average}</strong></p><Link href="/dashboard/recorrido" className="dashboard-text-link">Ver recorrido <ArrowRight size={16} /></Link></div></div><div className="dashboard-progress__bar" role="progressbar" aria-label="Materias aprobadas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div style={{ width: `${progress}%` }} /></div></section>
    <section className="card dashboard-agenda" aria-labelledby="dashboard-agenda"><div className="dashboard-agenda__heading"><div><p className="dashboard-section-index">02 / EN TIEMPO REAL</p><h2 id="dashboard-agenda" className="dashboard-section-title">Mi agenda<span aria-hidden>✳</span></h2></div><span aria-hidden className="dashboard-agenda__timecode">REC ● 00:24:06</span></div>{nextItems.length ? <ul className="dashboard-agenda__list">{nextItems.map(item => <li key={item.key}><span className="dashboard-agenda__date">{item.date === today ? "HOY" : formatDate(item.date)}<strong>{item.start_time ? item.start_time.slice(0, 5) : "—"}</strong></span><span className="dashboard-agenda__event"><strong>{item.title}</strong><small>{item.kind === "course" ? "Cursada" : item.kind === "fda" ? "FDA" : item.category ?? "Personal"}</small></span></li>)}</ul> : <p className="dashboard-agenda__empty">Tu agenda todavía está vacía.</p>}<Link href="/dashboard/agenda" className="dashboard-agenda__link">Ver mi agenda <ArrowRight size={16} /></Link></section>
    </div><section className="card dashboard-available" aria-labelledby="dashboard-disponibles"><div className="dashboard-available__copy"><p className="dashboard-section-index">03 / PRÓXIMO PASO</p><h2 id="dashboard-disponibles" className="dashboard-section-title">Ya podés cursar</h2><p className="dashboard-available__count">{available.length ? `${available.length} ${available.length === 1 ? "materia habilitada" : "materias habilitadas"}` : "Sin materias habilitadas por ahora"}</p>{available.length ? <ul className="dashboard-available__subjects">{available.slice(0, 3).map(item => <li key={item.subject.id}>{item.subject.name}</li>)}</ul> : <p className="dashboard-available__note">{curriculum === "new" ? "Las correlatividades de tu plan requieren revisión manual." : !rows.length ? "Cargá tus materias en Tu recorrido para consultar tus opciones." : "Consultá tu recorrido para ver qué te falta."}</p>}<Link href="/dashboard/disponibles" className="dashboard-available__link">Ver materias <ArrowRight size={16} /></Link></div><FdaPlate variant="moises-blueprint" photo className="dashboard-available__art" /></section>
    <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-2 sm:grid-cols-4"><QuickLink href="/dashboard/recorrido" label="Recorrido" icon={<GraduationCap size={18} />} /><QuickLink href="/catedras" label="Cátedras" icon={<Search size={18} />} /><QuickLink href="/agenda" label="Fechas FDA" icon={<CalendarDays size={18} />} /><QuickLink href="/dashboard/agenda" label="Mi agenda" icon={<CalendarRange size={18} />} /></nav>
    <section className="pt-2" aria-labelledby="dashboard-cartelera"><div className="flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">Comunidad</p><h2 id="dashboard-cartelera" className="mt-1 font-display text-2xl font-black">Cartelera Cronopios</h2></div><Link href="/cartelera" className="button-secondary text-sm">Ver toda la cartelera <ArrowRight size={16} /></Link></div>{highlights.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{highlights.map(post => <article key={post.id} className="relative min-w-0 border-2 border-ink bg-white p-4 shadow-[4px_4px_0_0_#221E21]"><span aria-hidden className="absolute -top-2 left-6 h-4 w-16 -rotate-3 border border-ink/20 bg-white/70" /><p className="font-mono text-[11px] font-bold uppercase tracking-wide">{post.event_type}{post.event_date ? ` · ${formatDate(post.event_date.slice(0, 10))}` : ""}</p><h3 className="mt-2 font-display text-lg font-black [overflow-wrap:anywhere]">{post.title}</h3><p className="mt-2 line-clamp-2 text-sm text-ink/75">{post.body}</p></article>)}</div> : <p className="mt-2 text-sm text-ink/60">Pronto habrá nuevas actividades.</p>}</section>
  </div>;
}

function QuickLink({ href, label, icon }: { href: "/dashboard/recorrido" | "/catedras" | "/agenda" | "/dashboard/agenda"; label: string; icon: React.ReactNode }) {
  return <Link href={href} className="flex min-h-12 min-w-0 items-center gap-2 border-b-2 border-ink/30 bg-white px-2 py-2 text-xs font-bold transition hover:border-ink hover:bg-cronopios-paper sm:text-sm">{icon}<span>{label}</span></Link>;
}
