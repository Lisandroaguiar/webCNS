import type { SupabaseClient } from "@supabase/supabase-js";

export type SubjectStatus = "pending" | "regular" | "passed";

/**
 * Obtiene el plan y el historial del usuario en una sola consulta relacional.
 * La RLS de user_subjects limita automáticamente los registros al usuario autenticado.
 */
export async function getUserSubjects(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("user_subjects")
    .select("id, status, grade, passed_at, subject:subjects(id, name, code, year, semester)")
    .eq("user_id", userId)
    .order("subjects(year)", { ascending: true });
}

/**
 * Actualiza una materia usando upsert para que el usuario pueda marcarla
 * por primera vez o editar una carga anterior sin duplicar filas.
 */
export async function saveUserSubject(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string | number,
  status: SubjectStatus,
  grade?: number,
  passedAt?: string
) {
  return supabase.from("user_subjects").upsert(
    {
      user_id: userId,
      subject_id: subjectId,
      status,
      // La calificación es independiente del estado académico.
      // Puede existir una nota de cursada aunque aún no esté aprobada.
      grade: grade ?? null,
      passed_at: status === "passed" ? passedAt ?? null : null,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,subject_id" }
  );
}

export async function saveUserSubjects(
  supabase: SupabaseClient,
  userId: string,
  subjects: Array<{ subjectId: string | number; status: SubjectStatus; grade?: number; passedAt?: string }>
) {
  const updatedAt = new Date().toISOString();
  return supabase.from("user_subjects").upsert(subjects.map(item => ({
    user_id: userId,
    subject_id: item.subjectId,
    status: item.status,
    grade: item.grade ?? null,
    passed_at: item.status === "passed" ? item.passedAt ?? null : null,
    updated_at: updatedAt
  })), { onConflict: "user_id,subject_id" });
}

/**
 * La cartelera solo devuelve publicaciones vigentes; la política RLS
 * también impide leer posts no publicados desde clientes autenticados.
 */
export async function getPublishedCommunityPosts(supabase: SupabaseClient) {
  return supabase
    .from("community_posts")
    .select("id, title, body, event_type, event_date, accent, created_at")
    .eq("is_published", true)
    .order("event_date", { ascending: true, nullsFirst: false });
}
