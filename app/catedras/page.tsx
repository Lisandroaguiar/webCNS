import { SessionAwareShell } from "@/components/app-shell/session-aware-shell";
import { CatedrasDirectory } from "@/components/catedras-directory";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function PublicCatedrasPage({ searchParams }: { searchParams?: { q?: string } }) {
  const user = await getCurrentUser();
  const supabase = user ? await createClient() : null;
  const profileResult = user && supabase
    ? await supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle()
    : null;
  const curriculum = profileResult?.data?.curriculum ?? null;
  const { data: planSubjects } = user && supabase && curriculum ? await supabase.from("subjects").select("id,name").eq("curriculum", curriculum).order("name") : { data: null };
  return <SessionAwareShell user={user}>
    <div className={user ? "" : "mx-auto max-w-6xl px-5 py-10 md:px-8"}>
      <p className="eyebrow">Facultad de Artes UNLP</p>
      <h1 className="mt-2 font-display text-4xl font-black">Guía de cátedras</h1>
      <p className="mt-2 max-w-2xl text-ink/60">Buscá materias, docentes, contactos y enlaces útiles. Tu cursada se organiza en Mi agenda.</p>
      <div className="mt-8"><CatedrasDirectory planSubjects={(planSubjects ?? []).map(item => ({ id: String(item.id), name: item.name }))} initialQuery={searchParams?.q ?? ""} authenticated={Boolean(user)} /></div>
    </div>
  </SessionAwareShell>;
}
