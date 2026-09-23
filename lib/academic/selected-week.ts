import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WeekSchedule } from "./weekly-schedule";

export async function getSelectedWeekSchedules(userId: string): Promise<WeekSchedule[]> {
  const supabase = await createClient();
  const { data: selections, error } = await supabase.from("user_schedule_selections").select("course_schedule_id").eq("user_id", userId);
  if (error) throw error;
  const ids = (selections ?? []).map(item => item.course_schedule_id);
  if (!ids.length) return [];
  // La lectura administrativa permite mostrar una selección que dejó de estar publicada.
  // Los IDs provienen exclusivamente de filas privadas que RLS ya limitó a este usuario.
  const { data: schedules, error: schedulesError } = await createAdminClient().from("course_schedules")
    .select("id,subject_id,raw_subject_name,weekday,start_time,end_time,commission,classroom,campus,curriculum,academic_year,semester,status")
    .in("id", ids);
  if (schedulesError) throw schedulesError;
  return (schedules ?? []) as WeekSchedule[];
}
