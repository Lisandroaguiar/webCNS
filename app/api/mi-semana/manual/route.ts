import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicPeriod, weekDays, timeMinutes } from "@/lib/academic/weekly-schedule";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para organizar tu semana." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const subjectId = String(body.subjectId ?? "");
  if (!subjectId || subjectId.length > 80) return NextResponse.json({ error: "Materia inválida." }, { status: 400 });
  const supabase = await createClient();
  const [{ data: profile }, { data: subject, error: subjectError }] = await Promise.all([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    supabase.from("subjects").select("id,name,curriculum").eq("id", subjectId).maybeSingle(),
  ]);
  if (subjectError || !subject || !profile?.curriculum || subject.curriculum !== profile.curriculum) return NextResponse.json({ error: "La materia no corresponde a tu plan." }, { status: 422 });
  const period = currentAcademicPeriod();
  const { data: existing, error: readError } = await supabase.from("user_custom_schedule_slots")
    .select("id").eq("user_id", user.id).eq("subject_id", subjectId)
    .eq("academic_year", period.academicYear).eq("semester", period.semester).limit(1).maybeSingle();
  if (readError) return NextResponse.json({ error: "No pudimos consultar tu semana." }, { status: 503 });
  if (existing) return NextResponse.json({ ok: true, id: existing.id });
  const { data, error } = await supabase.from("user_custom_schedule_slots")
    .insert({ user_id: user.id, subject_id: subjectId, subject_name: subject.name, academic_year: period.academicYear, semester: period.semester })
    .select("id").single();
  if (error) return NextResponse.json({ error: "No pudimos agregar la materia." }, { status: 422 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para editar tu semana." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const weekday = body.weekday == null || body.weekday === "" ? null : String(body.weekday);
  const start = body.start_time == null || body.start_time === "" ? null : String(body.start_time);
  const end = body.end_time == null || body.end_time === "" ? null : String(body.end_time);
  const classroom = String(body.classroom ?? "").trim().slice(0, 120) || null;
  const startMinutes = timeMinutes(start), endMinutes = timeMinutes(end);
  if (!Number.isSafeInteger(id) || id < 1 || (weekday && !weekDays.some(day => day === weekday)) ||
    (start !== null || end !== null ? !weekday || startMinutes == null || endMinutes == null || endMinutes <= startMinutes : weekday !== null)) {
    return NextResponse.json({ error: "Elegí día, inicio y fin válidos; el fin debe ser posterior al inicio." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_custom_schedule_slots")
    .update({ weekday, start_time: start, end_time: end, classroom, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No pudimos guardar el horario." }, { status: 422 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para editar tu semana." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Materia inválida." }, { status: 400 });
  const supabase = await createClient();
  const { error } = await supabase.from("user_custom_schedule_slots").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "No pudimos quitar la materia." }, { status: 422 });
  return NextResponse.json({ ok: true });
}
