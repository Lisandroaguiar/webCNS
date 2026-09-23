import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getSelectedWeekSchedules } from "@/lib/academic/selected-week";
import { getCustomWeekSlots } from "@/lib/academic/custom-week";
import { currentAcademicPeriod, isCurrentSchedule } from "@/lib/academic/weekly-schedule";
import { WeeklyPlanner } from "@/components/weekly-planner";

export default async function MiSemanaPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para organizar tu semana.</p>;
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle();
  if (profileError || !profile?.curriculum) return <div className="card">Elegí tu plan para organizar tu semana. <Link href="/dashboard/recorrido" className="font-bold underline">Ir a Recorrido</Link></div>;
  let selected, custom;
  try { [selected, custom] = await Promise.all([getSelectedWeekSchedules(user.id), getCustomWeekSlots(user.id)]); }
  catch { return <div className="card"><p>No pudimos cargar tu semana.</p><Link href="/dashboard/mi-semana" className="mt-3 inline-block font-bold underline">Reintentar</Link></div>; }
  const period = currentAcademicPeriod();
  const current = selected.filter(item => isCurrentSchedule(item, period, profile.curriculum));
  return <div className="min-w-0">
    <p className="eyebrow">Organización personal · {period.academicYear} · {period.semester}º cuatrimestre</p>
    <h1 className="mt-3 font-display text-4xl font-black">Mi semana</h1>
    <p className="mt-3 max-w-2xl text-sm text-ink/65">Este horario es una organización personal. No reemplaza tu inscripción oficial.</p>
    {current.some(item => item.semester == null) && <p className="mt-3 border-l-4 border-cronopios-magenta bg-white p-3 text-sm">Algunos horarios de tu plan no informan cuatrimestre; los mostramos identificados para que los verifiques.</p>}
    <WeeklyPlanner initialSchedules={current} initialCustomSlots={custom.filter(item => item.academic_year === period.academicYear && item.semester === period.semester)} />
  </div>;
}
