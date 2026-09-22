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
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Administración</p><h1 className="mt-2 font-display text-4xl font-black">Cartelera</h1></div><Link href="/admin/imports" className="font-bold underline">Ir a imports</Link></div><CarteleraAdmin posts={posts ?? []} /></div></main>;
}
