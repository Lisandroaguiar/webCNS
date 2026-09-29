import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeAcademicSubjectName } from "@/lib/academic/analytic-parser";

async function authorized() {
  const user = await getCurrentUser();
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase());
  return Boolean(user?.email && allowed.includes(user.email.toLowerCase()));
}

export async function POST(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const subjectId = String(body.subjectId ?? "").trim();
  const alias = String(body.alias ?? "").trim();
  const source = String(body.source ?? "").trim();
  if (!subjectId || alias.length < 2 || alias.length > 250 || source.length < 3 || source.length > 250) return NextResponse.json({ error: "Completá la materia, el alias y la fuente de verificación." }, { status: 400 });
  const admin = createAdminClient();
  const { data: subject } = await admin.from("curriculum_subjects").select("id,curriculum_id").eq("id", subjectId).maybeSingle();
  if (!subject) return NextResponse.json({ error: "La materia no existe." }, { status: 422 });
  const { data: existing } = await admin.from("curriculum_subject_aliases").select("alias").eq("curriculum_id", subject.curriculum_id).eq("verified", true).eq("active", true);
  if (existing?.some(row => normalizeAcademicSubjectName(row.alias) === normalizeAcademicSubjectName(alias))) return NextResponse.json({ error: "Ya existe una equivalencia con ese nombre en este plan." }, { status: 409 });
  const { error } = await admin.from("curriculum_subject_aliases").insert({ curriculum_subject_id: subject.id, curriculum_id: subject.curriculum_id, alias, source, verified: true, active: true });
  if (error?.code === "23505") return NextResponse.json({ error: "El alias ya está asignado en este plan." }, { status: 409 });
  if (error) return NextResponse.json({ error: "No pudimos guardar el alias." }, { status: 422 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const subjectId = String(body.subjectId ?? "");
  const alias = String(body.alias ?? "");
  if (!subjectId || !alias || typeof body.active !== "boolean") return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const admin = createAdminClient();
  if (body.active) {
    const { data: subject } = await admin.from("curriculum_subjects").select("curriculum_id").eq("id", subjectId).maybeSingle();
    if (!subject) return NextResponse.json({ error: "La materia no existe." }, { status: 422 });
    const { data: existing } = await admin.from("curriculum_subject_aliases").select("curriculum_subject_id,alias").eq("curriculum_id", subject.curriculum_id).eq("verified", true).eq("active", true);
    if (existing?.some(row => (row.curriculum_subject_id !== subjectId || row.alias !== alias) && normalizeAcademicSubjectName(row.alias) === normalizeAcademicSubjectName(alias))) return NextResponse.json({ error: "Ese nombre ya corresponde a otra materia de este plan." }, { status: 409 });
  }
  const { error } = await admin.from("curriculum_subject_aliases").update({ active: body.active }).eq("curriculum_subject_id", subjectId).eq("alias", alias);
  if (error) return NextResponse.json({ error: "No pudimos actualizar el alias." }, { status: 422 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Sin permisos." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const subjectId = String(body.subjectId ?? "");
  const alias = String(body.alias ?? "");
  if (!subjectId || !alias) return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  const { error } = await createAdminClient().from("curriculum_subject_aliases").delete().eq("curriculum_subject_id", subjectId).eq("alias", alias);
  if (error) return NextResponse.json({ error: "No pudimos eliminar el alias." }, { status: 422 });
  return NextResponse.json({ ok: true });
}
