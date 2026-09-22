import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { CarteleraAdmin } from "@/components/admin/cartelera-admin";

function isAdmin(email?: string | null) {
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(email && allowed.includes(email.toLowerCase()));
}

export default async function AdminCarteleraPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.email)) redirect("/dashboard");
  const { data: posts } = await createAdminClient().from("community_posts").select("id,title,body,event_type,event_date,event_time,location,image_url,link_url,accent,is_published").order("created_at", { ascending: false });
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Administración</p><h1 className="mt-2 font-display text-4xl font-black">Cartelera</h1></div><div className="flex w-full flex-wrap gap-3 sm:w-auto sm:items-center"><Link href="/cartelera" className="button-primary inline-flex min-h-11 items-center justify-center">Ver cartelera</Link><Link href="/dashboard" className="inline-flex min-h-11 items-center font-bold underline">Volver al inicio</Link><Link href="/admin/imports" className="inline-flex min-h-11 items-center font-bold underline">Ir a imports</Link></div></div><CarteleraAdmin posts={posts ?? []} /></div></main>;
}
