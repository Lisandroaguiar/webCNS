import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { timeMinutes, weekDays } from "@/lib/academic/weekly-schedule";

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.CRONOPIOS_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase());
  return Boolean(user?.email && allowed.includes(user.email.toLowerCase()));
}

function fields(body: Record<string, unknown>) {
  const raw_subject_name = String(body.raw_subject_name ?? "").trim();
  const curriculum = String(body.curriculum ?? "");
  const commission = String(body.commission ?? "").trim() || null;
  const weekday = String(body.weekday ?? "");
  const start_time = String(body.start_time ?? "");
  const end_time = String(body.end_time ?? "") || null;
  const classroom = String(body.classroom ?? "").trim() || null;
  const campus = String(body.campus ?? "").trim() || null;
  const semester = body.semester === "" || body.semester == null ? null : Number(body.semester);
  const academic_year = Number(body.academic_year);
  if (!raw_subject_name || raw_subject_name.length > 160 || !["new", "old", "profesorado"].includes(curriculum) ||
    !weekDays.some(day => day === weekday) || timeMinutes(start_time) == null ||
    (end_time && (timeMinutes(end_time) == null || timeMinutes(end_time)! <= timeMinutes(start_time)!)) ||
    (semester !== null && semester !== 1 && semester !== 2) || !Number.isInteger(academic_year) || academic_year < 2020 || academic_year > 2100 ||
    (commission?.length ?? 0) > 80 || (classroom?.length ?? 120) > 120 || (campus?.length ?? 0) > 80) return null;
  return { raw_subject_name, curriculum, commission, weekday, start_time, end_time, classroom, campus, semester, academic_year };
}

export async function POST(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const values = fields(body);
  if (!values) return NextResponse.json({ error: "Revisá los datos del horario." }, { status: 400 });
  const admin = createAdminClient();
  const { data: source } = await admin.from("data_sources").select("id").eq("key", "admin-manual-schedules").maybeSingle();
  if (!source) return NextResponse.json({ error: "Falta aplicar la migración de horarios administrativos." }, { status: 503 });
  const { data, error } = await admin.from("course_schedules").insert({ ...values, source_id: source.id, external_key: randomUUID(), subject_id: body.subject_id ? String(body.subject_id) : null, source_url: "https://web-cns.vercel.app/admin/horarios", source_label: "Administración de Cronopios", status: "published" }).select("id").single();
  if (error) return NextResponse.json({ error: "No pudimos agregar la comisión." }, { status: 422 });
  revalidateTag("course-schedules");
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  if (!await authorized()) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const values = fields(body);
  if (!Number.isSafeInteger(id) || id < 1 || !values) return NextResponse.json({ error: "Revisá los datos del horario." }, { status: 400 });
  const admin = createAdminClient();
  const { data: existing } = await admin.from("course_schedules").select("id,status").eq("id", id).maybeSingle();
  if (!existing || existing.status !== "published") return NextResponse.json({ error: "El horario ya no está publicado." }, { status: 404 });
  const { error } = await admin.from("course_schedules").update({ ...values, subject_id: body.subject_id ? String(body.subject_id) : null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: "No pudimos editar el horario." }, { status: 422 });
  const { error: overrideError } = await admin.from("admin_schedule_overrides").upsert({ course_schedule_id: id, changes: { ...values, subject_id: body.subject_id ? String(body.subject_id) : null }, updated_at: new Date().toISOString() });
  if (overrideError) return NextResponse.json({ error: "El horario se actualizó, pero no pudimos conservar la corrección ante futuras importaciones." }, { status: 503 });
  revalidateTag("course-schedules");
  return NextResponse.json({ ok: true });
}
