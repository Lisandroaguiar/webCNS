import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSchedulesPanel } from "@/components/admin/admin-schedules-panel";

export default async function AdminHorariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase());
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) redirect("/dashboard");
  const admin = createAdminClient();
  const schedules = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.from("course_schedules")
      .select("id,subject_id,raw_subject_name,curriculum,academic_year,semester,commission,weekday,start_time,end_time,classroom,campus,source_label,status")
      .order("academic_year", { ascending: false }).order("raw_subject_name").order("id")
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error(`No se pudieron cargar los horarios: ${error.message}`);
    schedules.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  const { data: subjects, error: subjectsError } = await admin.from("subjects").select("id,name,curriculum").order("name");
  if (subjectsError) throw new Error(`No se pudieron cargar las materias: ${subjectsError.message}`);
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><Link href="/admin/imports" className="font-bold underline">← Imports</Link><p className="eyebrow mt-6">Administración</p><h1 className="mt-2 font-display text-4xl font-black">Horarios y comisiones</h1><p className="mt-2 text-sm text-ink/65">Podés corregir horarios manuales e importados de PDF o planillas. Las correcciones se conservan al volver a importar; los borradores no aparecen en Cátedras hasta publicarlos.</p><AdminSchedulesPanel initialSchedules={schedules} subjects={(subjects ?? []).map(item => ({ id: String(item.id), name: item.name, curriculum: item.curriculum }))} /></div></main>;
}
