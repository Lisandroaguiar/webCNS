import { SessionAwareShell } from "@/components/app-shell/session-aware-shell";
import { CatedrasDirectory } from "@/components/catedras-directory";
import { getPublishedCourseSchedules } from "@/lib/supabase/public-data";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWeekSchedules } from "@/lib/academic/selected-week";
import { currentAcademicPeriod } from "@/lib/academic/weekly-schedule";
import { collapseIdenticalMeetings, dedupePublishedSchedules } from "@/lib/academic/schedule-display";

export default async function PublicCatedrasPage({ searchParams }: { searchParams?: { q?: string } }) {
  const [publishedSchedules, user] = await Promise.all([getPublishedCourseSchedules(), getCurrentUser()]);
  const supabase = user ? await createClient() : null;
  const [profileResult, selectedResult] = user && supabase ? await Promise.allSettled([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    getSelectedWeekSchedules(user.id),
  ]) : [null, null];
  const curriculum = profileResult?.status === "fulfilled" ? profileResult.value.data?.curriculum : null;
  const { data: planSubjects } = user && supabase && curriculum ? await supabase.from("subjects").select("id,name").eq("curriculum", curriculum).order("name") : { data: null };
  const selectedSchedules = selectedResult?.status === "fulfilled" ? selectedResult.value : [];
  const period = currentAcademicPeriod();
  const schedules = collapseIdenticalMeetings(dedupePublishedSchedules(publishedSchedules).filter(schedule =>
    schedule.academic_year === period.academicYear &&
    (schedule.semester === period.semester || schedule.semester == null) &&
    schedule.curriculum === (curriculum ?? "new")
  ), period.semester);
  return <SessionAwareShell user={user}>
    <div className={user ? "" : "mx-auto max-w-6xl px-5 py-10 md:px-8"}>
      <p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="mt-2 font-display text-4xl font-black">Guía de cátedras</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Buscá materias, contactos y referencias oficiales del Departamento de Multimedia.</p>
      <div className="mt-8"><CatedrasDirectory schedules={schedules} planSubjects={(planSubjects ?? []).map(item => ({ id: String(item.id), name: item.name }))} initialQuery={searchParams?.q ?? ""} selectedSchedules={selectedSchedules} activeCurriculum={curriculum} period={period} authenticated={Boolean(user)} /></div>
    </div>
  </SessionAwareShell>;
}
