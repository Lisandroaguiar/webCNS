import { MateriasManager } from "@/components/materias-manager";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { TrajectoryManager } from "@/components/academic/trajectory-manager";

export default async function RecorridoPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: active } = user ? await supabase.from("user_enrollments").select("curriculum_id").eq("user_id", user.id).eq("is_active", true).maybeSingle() : { data: null };
  const { data: plan } = active ? await supabase.from("curricula").select("catalog_kind").eq("id", active.curriculum_id).maybeSingle() : { data: null };
  return <><header className="mb-8"><p className="eyebrow">Seguimiento académico</p><h1 className="mt-2 font-display text-4xl font-bold">Mi recorrido</h1><p className="mt-2 text-ink/55">Registrá tu avance y entendé qué materias tenés disponibles.</p><Link href="/dashboard/trayectorias" className="button-secondary mt-4 inline-flex">Cambiar o agregar trayectoria</Link></header>{plan?.catalog_kind === "curriculum_subjects" && user ? <TrajectoryManager userId={user.id} /> : <MateriasManager />}</>;
}
