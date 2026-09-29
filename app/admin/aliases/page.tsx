import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubjectAliasesPanel } from "@/components/admin/subject-aliases-panel";
import { CurriculumAliasesPanel } from "@/components/admin/curriculum-aliases-panel";

export default async function SubjectAliasesPage() {
  const user = await getCurrentUser();
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) redirect("/dashboard");
  const admin = createAdminClient();
  const [{ data: subjects, error: subjectError }, { data: aliases, error: aliasError }, { data: curriculumSubjects }, { data: curriculumAliases }] = await Promise.all([
    admin.from("subjects").select("id,name,curriculum").order("name"),
    admin.from("subject_aliases").select("id,subject_id,alias,curriculum,source").eq("verified", true).order("created_at", { ascending: false }).limit(200),
    admin.from("curriculum_subjects").select("id,official_name,curriculum_id").like("curriculum_id", "plastica-%").order("official_name"),
    admin.from("curriculum_subject_aliases").select("curriculum_subject_id,curriculum_id,alias,source,verified,active").order("alias"),
  ]);
  if (subjectError || aliasError) return <main className="mx-auto max-w-4xl p-6"><p>No pudimos cargar los aliases. Revisá la migración de Sprint 8.</p></main>;
  return <main className="mx-auto max-w-5xl px-5 py-8"><Link href="/admin/imports" className="button-text">← Volver a imports</Link><p className="eyebrow mt-5">Datos académicos críticos</p><h1 className="mt-2 font-display text-4xl font-black">Aliases de materias</h1><SubjectAliasesPanel subjects={(subjects ?? []).map(item => ({ ...item, id: String(item.id) }))} initialAliases={(aliases ?? []).map(item => ({ ...item, subject_id: String(item.subject_id) }))} /><CurriculumAliasesPanel subjects={(curriculumSubjects ?? [])} initialAliases={(curriculumAliases ?? [])} /></main>;
}
