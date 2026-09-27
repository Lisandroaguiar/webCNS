import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sourceRegistry } from "@/lib/fda/source-registry";
import { AdminImportsPanel } from "@/components/admin/admin-imports-panel";

function isAdmin(email?: string | null) {
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

export default async function AdminImportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) redirect("/dashboard");
  const admin = createAdminClient();
  const calendarKeys = Object.values(sourceRegistry).filter(source => source.sourceType === "academic_calendar").map(source => source.key);
  const [{ data: sources }, { data: runs }, { data: eventDrafts }] = await Promise.all([
    admin.from("data_sources").select("id,key,name,last_checked_at,last_success_at").in("key", calendarKeys).order("name"),
    admin.from("import_runs").select("id,source_id,started_at,finished_at,status,records_found,records_changed,warning_count,error_summary").order("started_at", { ascending: false }).limit(30),
    admin.from("academic_events").select("id,title,source_label,status").eq("status", "draft").order("starts_at"),
  ]);
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Administración</p><h1 className="mt-2 font-display text-4xl font-black">Imports FDA</h1></div><div className="flex flex-wrap gap-4"><Link href="/admin/aliases" className="font-bold underline">Aliases de materias</Link><Link href="/admin/cartelera" className="font-bold underline">Administrar cartelera</Link></div></div><p className="mt-3 max-w-2xl text-ink/65">Solo se importan fechas académicas institucionales. Las cursadas se organizan personalmente en Mi agenda.</p><AdminImportsPanel sources={sources ?? Object.values(sourceRegistry).filter(source => source.sourceType === "academic_calendar").map(source => ({ id: source.key, key: source.key, name: source.name, last_checked_at: null, last_success_at: null }))} runs={runs ?? []} drafts={(eventDrafts ?? []).map(item => ({ ...item, table: "academic_events" as const, label: item.title }))} /></div></main>;
}
