import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWeekSchedules } from "@/lib/academic/selected-week";
import { getCustomWeekSlots } from "@/lib/academic/custom-week";
import { getPublishedAcademicEvents, getPublishedCourseSchedules } from "@/lib/supabase/public-data";
import { currentAcademicPeriod } from "@/lib/academic/weekly-schedule";
import { localDay } from "@/lib/academic/personal-calendar";
import { MiAgenda } from "@/components/mi-agenda";

export default async function MiAgendaPage({ searchParams }: { searchParams?: { subject?: string } }) {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para organizar tu agenda.</p>;
  const supabase = await createClient();
  const today = localDay();
  const [profileResult, subjectsResult, selectedResult, manualResult, personalResult, fdaResult, schedulesResult] = await Promise.allSettled([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    supabase.from("subjects").select("id,name,curriculum").order("name"),
    getSelectedWeekSchedules(user.id),
    getCustomWeekSlots(user.id),
    supabase.from("user_calendar_events").select("id,title,event_date,start_time,end_time,location,notes,category,recurrence_type").eq("user_id", user.id).or(`event_date.gte.${today},recurrence_type.eq.weekly`).order("event_date").limit(500),
    getPublishedAcademicEvents(),
    getPublishedCourseSchedules(),
  ]);
  const profile = profileResult.status === "fulfilled" ? profileResult.value.data : null;
  const curriculum = profile?.curriculum;
  if (!curriculum) return <div className="card">Elegí tu carrera y plan en Mi recorrido para armar tu agenda.</div>;
  const subjects = subjectsResult.status === "fulfilled" ? subjectsResult.value.data ?? [] : [];
  const selected = selectedResult.status === "fulfilled" ? selectedResult.value : [];
  const manual = manualResult.status === "fulfilled" ? manualResult.value : [];
  const personal = personalResult.status === "fulfilled" ? personalResult.value.data ?? [] : [];
  const fda = fdaResult.status === "fulfilled" ? fdaResult.value : [];
  const published = schedulesResult.status === "fulfilled" ? schedulesResult.value : [];
  if (selectedResult.status === "rejected" || manualResult.status === "rejected" || personalResult.status === "rejected" ||
    (personalResult.status === "fulfilled" && personalResult.value.error)) return <div className="card">No pudimos cargar tu agenda. Actualizá la página para reintentar.</div>;
  const period = currentAcademicPeriod();
  return <MiAgenda initialOfficial={selected} initialManual={manual} initialPersonal={personal as Parameters<typeof MiAgenda>[0]["initialPersonal"]} fda={fda} published={published.filter(item => item.academic_year === period.academicYear && item.curriculum === curriculum && (item.semester === period.semester || item.semester == null))} subjects={subjects.filter(item => item.curriculum === curriculum).map(item => ({ id: String(item.id), name: item.name }))} curriculum={curriculum} period={period} today={today} initialSubjectId={searchParams?.subject ?? null} />;
}
