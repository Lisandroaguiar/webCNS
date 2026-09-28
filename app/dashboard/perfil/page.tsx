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
  const { data: enrollment } = user ? await supabase.from("user_enrollments").select("program_id,curriculum_id,orientation_id").eq("user_id", user.id).eq("is_active", true).maybeSingle() : { data: null };
  const [{ data: activeProgram }, { data: activePlan }, { data: activeOrientation }] = enrollment ? await Promise.all([
    supabase.from("academic_programs").select("name").eq("id", enrollment.program_id).maybeSingle(),
    supabase.from("curricula").select("display_name").eq("id", enrollment.curriculum_id).maybeSingle(),
    enrollment.orientation_id ? supabase.from("academic_orientations").select("name").eq("id", enrollment.orientation_id).maybeSingle() : Promise.resolve({ data: null }),
  ]) : [{ data: null }, { data: null }, { data: null }];
  return <section className="max-w-2xl">
    <PaperScrap className="relative px-7 py-8"><Tape className="-right-4 -top-4 rotate-6" /><p className="eyebrow">Cuenta</p>
    <h1 className="mt-4 font-display text-4xl font-black">Perfil y configuración</h1></PaperScrap>
    <div className="card mt-8">
      <p className="text-sm text-cronopios-ink/55">Sesión iniciada como</p>
      <p className="mt-2 break-all text-sm">{user?.email || "Estudiante"}</p>
      <ProfileNameForm initialName={visibleName} />
      {activeProgram && <div className="mt-5 border-l-4 border-cronopios-magenta pl-3"><p className="text-xs font-bold uppercase tracking-wide text-ink/55">Trayectoria activa</p><p className="font-bold">{activeProgram.name}</p><p className="text-sm text-ink/65">{activeOrientation?.name ? `${activeOrientation.name} · ` : ""}{activePlan?.display_name}</p></div>}
      <p className="mt-6 text-sm text-cronopios-ink/60">Podés elegir tu carrera, título, plan y orientación en Mis trayectorias.</p>
      <Link href="/dashboard/trayectorias" className="button-primary mt-6 inline-block">Mis trayectorias</Link>
      <div className="mt-6 border-t border-cronopios-ink/15 pt-3"><SignOutButton /></div>
    </div><NotificationSettings reminderCount={reminderCount ?? 0} />
  </section>;
}
