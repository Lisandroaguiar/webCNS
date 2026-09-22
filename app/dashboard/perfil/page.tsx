import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { PaperScrap, Tape } from "@/components/visual/paper";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { count: reminderCount } = user ? await supabase.from("event_reminders").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true) : { count: 0 };
  return <section className="max-w-2xl">
    <PaperScrap className="relative px-7 py-8"><Tape className="-right-4 -top-4 rotate-6" /><p className="eyebrow">Cuenta</p>
    <h1 className="mt-4 font-display text-4xl font-black">Perfil y configuración</h1></PaperScrap>
    <div className="card mt-8">
      <p className="text-sm text-cronopios-ink/55">Sesión iniciada como</p>
      <p className="mt-2 font-bold">{user?.email || "Estudiante"}</p>
      <p className="mt-6 text-sm text-cronopios-ink/60">Podés elegir tu carrera y plan desde Mi recorrido.</p>
      <Link href="/dashboard/recorrido" className="button-primary mt-6 inline-block">Ir a mi recorrido</Link>
      <div className="mt-6 border-t border-cronopios-ink/15 pt-3"><SignOutButton /></div>
    </div><NotificationSettings reminderCount={reminderCount ?? 0} />
  </section>;
}
