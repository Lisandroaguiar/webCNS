import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { TrajectoryManager } from "@/components/academic/trajectory-manager";

export default async function RevisarRecorridoPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para revisar tu recorrido.</p>;
  return <main className="min-w-0"><p className="eyebrow">Seguimiento académico</p><h1 className="mt-2 font-display text-4xl font-black">Materias para confirmar</h1><p className="mt-2 text-ink/65">Estas filas todavía no afectan tu progreso. Podés confirmarlas, ignorarlas o volver más tarde.</p><Link href="/dashboard/recorrido" className="button-secondary mt-4 inline-flex">Volver a Recorrido</Link><div className="mt-6"><TrajectoryManager userId={user.id} reviewOnly /></div></main>;
}
