import type { SupabaseClient } from "@supabase/supabase-js";
import { degreeOptions, type DegreeValue, type CurriculumValue } from "@/lib/academic/curriculum";

/** Degree is user-editable academic metadata, never an authorization claim. */
export async function saveAcademicProfile(supabase: SupabaseClient, degree: DegreeValue, curriculum: CurriculumValue) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
  const { data: profile, error: profileError } = await supabase.from("profiles")
    .update({ curriculum, updated_at: new Date().toISOString() }).eq("id", user.id)
    .select("id, curriculum").single();
  if (profileError || !profile) throw new Error(`No pudimos guardar tu plan${profileError?.code ? ` (${profileError.code})` : ""}.`);
  const degreeLabel = degreeOptions.find(option => option.value === degree)!.profileValue;
  const { data, error } = await supabase.auth.updateUser({ data: { degree: degreeLabel } });
  if (error || data.user?.user_metadata?.degree !== degreeLabel) throw new Error(`No pudimos guardar tu carrera${error?.code ? ` (${error.code})` : ""}. Intentá nuevamente.`);
}

