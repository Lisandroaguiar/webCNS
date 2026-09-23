import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { detectDegree } from "@/lib/academic/curriculum";
import { getCourseEligibility, type CourseEligibility, type EligibilitySubject } from "@/lib/academic/course-eligibility";

function CourseCard({ item }: { item: CourseEligibility }) {
  const label = item.status === "available" ? "Ya podés cursarla" : item.status === "blocked" ? `Te faltan ${item.missingRequirements.length} requisitos` : item.status === "unknown" ? "Revisión manual" : item.status === "in_progress" ? "Regularizada" : "Aprobada";
  return <details className="min-w-0 border-2 border-ink bg-white p-4 shadow-[4px_4px_0_0_#221E21] open:bg-cronopios-paper">
    <summary className="cursor-pointer list-none"><span className="block text-xs font-black uppercase tracking-widest text-cronopios-magenta">{label}</span><span className="mt-2 block font-display text-xl font-black">{item.subject.name}</span><span className="mt-2 block text-xs text-ink/55">Tocá para ver el detalle</span></summary>
    <div className="mt-4 border-t border-ink/20 pt-4 text-sm">
      {item.status === "available" && <p>Ya cumpliste todas las correlatividades registradas para cursarla.</p>}
      {item.status === "unknown" && <p>{item.reason}</p>}
      {item.requirements.length > 0 && <><p className="font-bold">Requisitos registrados</p><ul className="mt-2 space-y-1">{item.requirements.map(requirement => <li key={`${requirement.subjectId}-${requirement.kind}`}>{requirement.satisfied ? "✓" : "○"} {requirement.name} · {requirement.kind === "passed" ? "aprobada" : "regular o aprobada"}</li>)}</ul></>}
      {item.status === "blocked" && <p className="mt-3 font-bold">Todavía necesitás {item.missingRequirements.map(requirement => requirement.name).join(", ")}.</p>}
      {item.requiredBy.length > 0 && <p className="mt-4 text-ink/65">Es requisito para: {item.requiredBy.join(", ")}.</p>}
      {item.status === "available" && <div className="mt-4 flex flex-wrap gap-3"><Link href={`/dashboard/agenda?subject=${encodeURIComponent(String(item.subject.id))}`} className="inline-flex min-h-11 items-center border-2 border-ink bg-cronopios-green px-4 font-bold">Agregar a Mi agenda</Link><Link href={`/catedras?q=${encodeURIComponent(item.subject.name)}`} className="inline-flex min-h-11 items-center px-2 font-bold underline">Ver cátedra</Link></div>}
    </div>
  </details>;
}

export default async function DisponiblesPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Iniciá sesión para ver tu recorrido.</p>;
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: subjects, error: subjectsError }, { data: history, error: historyError }] = await Promise.all([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    supabase.from("subjects").select("id,name,code,year,curriculum").order("year").order("name"),
    supabase.from("user_subjects").select("subject_id,status").eq("user_id", user.id),
  ]);
  if (profileError || subjectsError || historyError) return <p className="card">No pudimos cargar el plan. Intentá de nuevo en unos minutos.</p>;
  const degree = detectDegree(user.user_metadata?.degree ?? "");
  if (!profile?.curriculum || !degree) return <div className="card"><p>Primero elegí tu carrera y plan para consultar las materias disponibles.</p><Link href="/dashboard/perfil" className="mt-3 inline-block font-bold underline">Ir a Perfil</Link></div>;
  const curriculum = profile?.curriculum === "new" ? "new" : "old";
  const results = getCourseEligibility({ subjects: (subjects ?? []) as EligibilitySubject[], userSubjects: history ?? [], curriculum, degree });
  for (const item of results.filter(item => item.reasonCode === "missing_requirement")) console.warn("course_eligibility_missing_requirement", { curriculum, subjectCode: item.subject.code });
  const available = results.filter(item => item.status === "available");
  const near = results.filter(item => item.status === "blocked" && item.missingRequirements.length === 1);
  const blocked = results.filter(item => item.status === "blocked" && item.missingRequirements.length > 1);
  const unknown = results.filter(item => item.status === "unknown");
  return <div className="min-w-0">
    <p className="eyebrow">Plan {curriculum === "old" ? "2006" : "2024"} · {degree === "profesorado" ? "Profesorado" : "Licenciatura"}</p>
    <h1 className="mt-3 font-display text-4xl font-black">Qué podés cursar</h1>
    <p className="mt-3 text-ink/70">Según las materias que cargaste y las correlatividades registradas en Mesita.</p>
    <p className="mt-2 text-sm text-ink/60">Usalo como orientación y verificá siempre las condiciones vigentes de tu plan. Si te falta cargar una materia, este resultado puede cambiar.</p>
    {!history?.length ? <div className="card mt-8"><p className="font-bold">Primero carguemos tu recorrido.</p><Link href="/dashboard/recorrido" className="mt-3 inline-block font-bold underline">Ir a Recorrido</Link></div> : results.length > 0 && results.every(item => item.status === "completed") ? <p className="card mt-8">Ya completaste todas las materias registradas de este plan.</p> : <>
      <section className="mt-8"><h2 className="font-display text-2xl font-black">Disponibles ahora</h2><p className="mt-1 text-sm text-ink/60">{available.length} {available.length === 1 ? "materia habilitada" : "materias habilitadas"} con los datos actuales.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{available.map(item => <CourseCard key={item.subject.id} item={item} />)}{!available.length && <p className="card">No encontramos materias nuevas habilitadas con el recorrido actual.</p>}</div></section>
      {near.length > 0 && <section className="mt-10"><h2 className="font-display text-2xl font-black">Te falta poco</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{near.map(item => <CourseCard key={item.subject.id} item={item} />)}</div></section>}
      {blocked.length > 0 && <details className="mt-10"><summary className="cursor-pointer font-display text-2xl font-black">Todavía bloqueadas · {blocked.length}</summary><div className="mt-4 grid gap-4 md:grid-cols-2">{blocked.map(item => <CourseCard key={item.subject.id} item={item} />)}</div></details>}
      {unknown.length > 0 && <section className="mt-10"><h2 className="font-display text-2xl font-black">Para revisar</h2><p className="mt-2 text-sm text-ink/60">Hay materias cuyas reglas todavía necesitamos revisar manualmente.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{unknown.map(item => <CourseCard key={item.subject.id} item={item} />)}</div></section>}
    </>}
  </div>;
}
