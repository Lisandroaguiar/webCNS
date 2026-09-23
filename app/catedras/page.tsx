import { SessionAwareShell } from "@/components/app-shell/session-aware-shell";
import { CatedrasDirectory } from "@/components/catedras-directory";
import { getPublishedCourseSchedules } from "@/lib/supabase/public-data";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSelectedWeekSchedules } from "@/lib/academic/selected-week";
import { currentAcademicPeriod } from "@/lib/academic/weekly-schedule";

export default async function PublicCatedrasPage({ searchParams }: { searchParams?: { q?: string } }) {
  const [schedules, user] = await Promise.all([getPublishedCourseSchedules(), getCurrentUser()]);
  const supabase = user ? await createClient() : null;
  const [profileResult, selectedResult] = user && supabase ? await Promise.allSettled([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    getSelectedWeekSchedules(user.id),
  ]) : [null, null];
  const curriculum = profileResult?.status === "fulfilled" ? profileResult.value.data?.curriculum : null;
  const selectedSchedules = selectedResult?.status === "fulfilled" ? selectedResult.value : [];
  return <SessionAwareShell user={user}>
    <div className={user ? "" : "mx-auto max-w-6xl px-5 py-10 md:px-8"}>
      <p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="mt-2 font-display text-4xl font-black">Guía de cátedras</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Buscá materias, contactos y referencias oficiales del Departamento de Multimedia.</p>
      <div className="mt-8"><CatedrasDirectory schedules={schedules} initialQuery={searchParams?.q ?? ""} selectedSchedules={selectedSchedules} activeCurriculum={curriculum} period={currentAcademicPeriod()} authenticated={Boolean(user)} /></div>
    </div>
  </SessionAwareShell>;
}
