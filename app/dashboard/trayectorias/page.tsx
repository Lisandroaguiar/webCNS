import { getCurrentUser } from "@/lib/supabase/current-user";
import { TrajectoryManager } from "@/components/academic/trajectory-manager";

export default async function TrayectoriasPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para ver tus trayectorias.</p>;
  return <main><p className="eyebrow">Seguimiento académico</p><h1 className="mt-2 font-display text-4xl font-black">Mis trayectorias</h1><p className="mt-2 text-ink/65">Podés llevar más de un título, plan u orientación y elegir cuál ver ahora.</p><div className="mt-7"><TrajectoryManager key={user.id} userId={user.id} /></div></main>;
}
