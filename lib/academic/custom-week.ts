import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CustomWeekSlot = {
  id: number;
  subject_id: string | null;
  subject_name: string;
  academic_year: number;
  semester: number | null;
  weekday: string | null;
  start_time: string | null;
  end_time: string | null;
  classroom: string | null;
  location: string | null;
  commission: string | null;
  notes?: string | null;
};

export async function getCustomWeekSlots(userId: string): Promise<CustomWeekSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_course_entries")
    .select("id,subject_id,subject_name,academic_year,semester,weekday,start_time,end_time,classroom,location,commission,notes")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}
