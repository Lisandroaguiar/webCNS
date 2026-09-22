import { PublicHeader } from "@/components/app-shell/public-header";
import { CatedrasDirectory } from "@/components/catedras-directory";
import { createClient } from "@/lib/supabase/server";

export default async function PublicCatedrasPage() {
  const supabase = await createClient();
  const { data: schedules } = await supabase.from("course_schedules").select("raw_subject_name,weekday,start_time,end_time,commission,classroom,campus,notes,source_label,source_url").eq("status", "published").order("weekday").order("start_time");
  return <main className="min-h-screen bg-cronopios-paper">
    <PublicHeader />
    <div className="mx-auto max-w-6xl px-5 py-10 md:px-8">
      <p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="mt-2 font-display text-4xl font-black">Guía de cátedras</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Buscá materias, contactos y referencias oficiales del Departamento de Multimedia.</p>
      <div className="mt-8"><CatedrasDirectory schedules={schedules ?? []} /></div>
    </div>
  </main>;
}
