import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { isComplementaryWorkshopSlot } from "@/lib/academic/multicarrera";
import { getCustomWeekSlots } from "@/lib/academic/custom-week";
import { getPublishedAcademicEvents } from "@/lib/supabase/public-data";
import { currentAcademicPeriod } from "@/lib/academic/weekly-schedule";
import { localDay } from "@/lib/academic/personal-calendar";
import { MiAgenda } from "@/components/mi-agenda";

export default async function MiAgendaPage({ searchParams }: { searchParams?: { subject?: string; add?: string } }) {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para organizar tu agenda.</p>;
  const supabase = await createClient();
  const today = localDay();
  const [profileResult, subjectsResult, manualResult, personalResult, fdaResult, enrollmentResult] = await Promise.allSettled([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    supabase.from("subjects").select("id,name,curriculum").order("name"),
    getCustomWeekSlots(user.id),
    supabase.from("user_calendar_events").select("id,title,event_date,start_time,end_time,location,notes,category,recurrence_type").eq("user_id", user.id).or(`event_date.gte.${today},recurrence_type.eq.weekly`).order("event_date").limit(500),
    getPublishedAcademicEvents(),
    supabase.from("user_enrollments").select("id,curriculum_id,program_id,orientation_id").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);
  const profile = profileResult.status === "fulfilled" ? profileResult.value.data : null;
  const curriculum = profile?.curriculum;
  const enrollment = enrollmentResult.status === "fulfilled" ? enrollmentResult.value.data : null;
  const { data: activePlan } = enrollment ? await supabase.from("curricula").select("catalog_kind").eq("id", enrollment.curriculum_id).maybeSingle() : { data: null };
  if (!curriculum && !enrollment) return <div className="card">Elegí tu carrera y plan en Mi recorrido para armar tu agenda.</div>;
  const subjects = subjectsResult.status === "fulfilled" ? subjectsResult.value.data ?? [] : [];
  const manual = manualResult.status === "fulfilled" ? manualResult.value : [];
  const personal = personalResult.status === "fulfilled" ? personalResult.value.data ?? [] : [];
  const fda = fdaResult.status === "fulfilled" ? fdaResult.value : [];
  if (manualResult.status === "rejected" || personalResult.status === "rejected" ||
    (personalResult.status === "fulfilled" && personalResult.value.error)) return <div className="card">No pudimos cargar tu agenda. Actualizá la página para reintentar.</div>;
  const period = currentAcademicPeriod();
  let availableSubjects = subjects.filter(item => item.curriculum === curriculum).map(item => ({ id: String(item.id), name: item.name }));
  if (enrollment && activePlan?.catalog_kind === "curriculum_subjects") {
    const [{ data: program }, { data: plasticSubjects }] = await Promise.all([
      supabase.from("academic_programs").select("degree_type").eq("id", enrollment.program_id).single(),
      supabase.from("curriculum_subjects").select("id,official_name,degree_scope,orientation_condition").eq("curriculum_id", enrollment.curriculum_id).order("year_level").order("official_name"),
    ]);
    availableSubjects = (plasticSubjects ?? []).filter(item =>
      !isComplementaryWorkshopSlot({ curriculumId: enrollment.curriculum_id, officialName: item.official_name }) &&
      (item.degree_scope === "both" || item.degree_scope === program?.degree_type) &&
      (item.orientation_condition === "all" || enrollment.orientation_id !== "dibujo"))
      .map(item => ({ id: item.id, name: item.official_name }));
  }
  const initialSubjectId = availableSubjects.some(item => item.id === searchParams?.subject) ? searchParams!.subject! : null;
  return <MiAgenda initialManual={manual} initialPersonal={personal as Parameters<typeof MiAgenda>[0]["initialPersonal"]} fda={fda} subjects={availableSubjects} period={period} today={today} initialSubjectId={initialSubjectId} initialAddCourse={searchParams?.add === "course" || Boolean(initialSubjectId)} />;
}
