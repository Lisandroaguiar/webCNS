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
  const [{ data: schedules }, { data: subjects }] = await Promise.all([
    admin.from("course_schedules").select("id,subject_id,raw_subject_name,curriculum,academic_year,semester,commission,weekday,start_time,end_time,classroom,campus").eq("status", "published").eq("academic_year", new Date().getFullYear()).order("raw_subject_name"),
    admin.from("subjects").select("id,name,curriculum").order("name"),
  ]);
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><Link href="/admin/imports" className="font-bold underline">← Imports</Link><p className="eyebrow mt-6">Administración</p><h1 className="mt-2 font-display text-4xl font-black">Horarios y comisiones</h1><p className="mt-2 text-sm text-ink/65">Las correcciones publicadas aparecen en Cátedras y se conservan al volver a importar.</p><AdminSchedulesPanel initialSchedules={schedules ?? []} subjects={(subjects ?? []).map(item => ({ id: String(item.id), name: item.name, curriculum: item.curriculum }))} /></div></main>;
}
