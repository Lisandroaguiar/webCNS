import type { SupabaseClient } from "@supabase/supabase-js";

export async function isAcademicSetupComplete(supabase: SupabaseClient, userId: string) {
  const [{ data: profile }, { count }, { data: { user } }] = await Promise.all([
    supabase.from("profiles").select("curriculum").eq("id", userId).maybeSingle(),
    supabase.from("user_subjects").select("id", { count: "exact", head: true }).eq("user_id", userId).in("status", ["passed", "regular"]),
    supabase.auth.getUser()
  ]);
  return Boolean(user?.id === userId && user.user_metadata?.degree && (profile?.curriculum === "old" || profile?.curriculum === "new") && (count ?? 0) > 0);
}

