import { MateriasManager } from "@/components/materias-manager";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { TrajectoryManager } from "@/components/academic/trajectory-manager";
import { TrajectorySwitcher, type TrajectoryOption } from "@/components/academic/trajectory-switcher";

export default async function RecorridoPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const [{ data: enrollments }, { data: programs }, { data: plans }, { data: orientations }] = user ? await Promise.all([
    supabase.from("user_enrollments").select("id,program_id,curriculum_id,orientation_id,is_active").eq("user_id", user.id).is("deleted_at", null),
    supabase.from("academic_programs").select("id,name,degree_type"),
    supabase.from("curricula").select("id,display_name,catalog_kind,legacy_curriculum"),
    supabase.from("academic_orientations").select("id,name"),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const active = enrollments?.find(row => row.is_active);
  const activeProgram = programs?.find(row => row.id === active?.program_id);
  const activePlan = plans?.find(row => row.id === active?.curriculum_id);
  const options: TrajectoryOption[] = (enrollments ?? []).map(row => {
    const program = programs?.find(item => item.id === row.program_id);
    const plan = plans?.find(item => item.id === row.curriculum_id);
    const orientation = orientations?.find(item => item.id === row.orientation_id);
    return { id: row.id, label: [program?.name ?? row.program_id, orientation?.name, plan?.display_name ?? row.curriculum_id].filter(Boolean).join(" · "), degree: program?.degree_type === "profesorado" ? "profesorado" : "licenciatura", legacyCurriculum: plan?.legacy_curriculum === "old" || plan?.legacy_curriculum === "new" ? plan.legacy_curriculum : null };
  });
  return <><header className="mb-8"><p className="eyebrow">Seguimiento académico</p><h1 className="mt-2 font-display text-4xl font-bold">Mi recorrido</h1><p className="mt-2 text-ink/55">Registrá tu avance y entendé qué materias tenés disponibles.</p></header>
    {options.length ? <TrajectorySwitcher options={options} activeId={active?.id ?? null} /> : <Link href="/dashboard/trayectorias" className="button-secondary mb-6 inline-flex">Agregar trayectoria</Link>}
    {activePlan?.catalog_kind === "curriculum_subjects" && user ? <TrajectoryManager key={active?.id} userId={user.id} showManagement={false} /> : <MateriasManager key={active?.id ?? "legacy"} managedByEnrollment={Boolean(active)} initialDegree={activeProgram?.degree_type === "profesorado" ? "profesorado" : "licenciatura"} initialCurriculum={activePlan?.legacy_curriculum === "new" ? "new" : "old"} />}
  </>;
}
