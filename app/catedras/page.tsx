import { SessionAwareShell } from "@/components/app-shell/session-aware-shell";
import { CatedrasDirectory } from "@/components/catedras-directory";
import { getPublishedCourseSchedules } from "@/lib/supabase/public-data";
import { getCurrentUser } from "@/lib/supabase/current-user";

export default async function PublicCatedrasPage() {
  const [schedules, user] = await Promise.all([getPublishedCourseSchedules(), getCurrentUser()]);
  return <SessionAwareShell user={user}>
    <div className={user ? "" : "mx-auto max-w-6xl px-5 py-10 md:px-8"}>
      <p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="mt-2 font-display text-4xl font-black">Guía de cátedras</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Buscá materias, contactos y referencias oficiales del Departamento de Multimedia.</p>
      <div className="mt-8"><CatedrasDirectory schedules={schedules} /></div>
    </div>
  </SessionAwareShell>;
}
