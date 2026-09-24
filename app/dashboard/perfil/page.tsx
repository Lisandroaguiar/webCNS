import { SignOutButton } from "@/components/auth/sign-out-button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { NotificationSettings } from "@/components/notifications/notification-settings";
import { PaperScrap, Tape } from "@/components/visual/paper";
import { ProfileNameForm } from "@/components/profile/profile-name-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const { data: profile } = user ? await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle() : { data: null };
  const storedName = profile?.full_name?.trim();
  const visibleName = storedName && storedName !== "Estudiante" ? storedName :
    user?.user_metadata?.nombre || user?.user_metadata?.full_name || user?.user_metadata?.name || "Estudiante";
  const { count: reminderCount } = user ? await supabase.from("event_reminders").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true) : { count: 0 };
  return <section className="max-w-2xl">
    <PaperScrap className="relative px-7 py-8"><Tape className="-right-4 -top-4 rotate-6" /><p className="eyebrow">Cuenta</p>
    <h1 className="mt-4 font-display text-4xl font-black">Perfil y configuración</h1></PaperScrap>
    <div className="card mt-8">
      <p className="text-sm text-cronopios-ink/55">Sesión iniciada como</p>
      <p className="mt-2 break-all text-sm">{user?.email || "Estudiante"}</p>
      <ProfileNameForm initialName={visibleName} />
      <p className="mt-6 text-sm text-cronopios-ink/60">Podés elegir tu carrera y plan desde Mi recorrido.</p>
      <Link href="/dashboard/recorrido" className="button-primary mt-6 inline-block">Ir a mi recorrido</Link>
      <div className="mt-6 border-t border-cronopios-ink/15 pt-3"><SignOutButton /></div>
    </div><NotificationSettings reminderCount={reminderCount ?? 0} />
  </section>;
}
