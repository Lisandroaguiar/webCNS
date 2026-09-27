import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!user?.email || !allowed.includes(user.email.toLowerCase())) return NextResponse.json({ error: "Sin permisos de administración." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const subjectId = String(body.subjectId ?? "");
  const alias = String(body.alias ?? "").trim();
  const source = String(body.source ?? "Revisión humana").trim();
  if (!subjectId || subjectId.length > 80 || !alias || alias.length > 160 || source.length > 160) return NextResponse.json({ error: "Alias inválido." }, { status: 400 });
  const admin = createAdminClient();
  const { data: subject, error: subjectError } = await admin.from("subjects").select("id,curriculum").eq("id", subjectId).maybeSingle();
  if (subjectError || !subject?.curriculum) return NextResponse.json({ error: "La materia no existe." }, { status: 422 });
  const { data, error } = await admin.from("subject_aliases").insert({ subject_id: String(subject.id), curriculum: subject.curriculum, alias, source, verified: true }).select("id").single();
  if (error?.code === "23505") return NextResponse.json({ error: "Ese alias ya existe para esta materia." }, { status: 409 });
  if (error) return NextResponse.json({ error: "No pudimos guardar el alias." }, { status: 422 });
  return NextResponse.json({ ok: true, id: data.id });
}
