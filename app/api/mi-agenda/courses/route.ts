import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createClient } from "@/lib/supabase/server";
import { currentAcademicPeriod, timeMinutes, weekDays } from "@/lib/academic/weekly-schedule";

function manualFields(body: Record<string, unknown>) {
  const weekday = String(body.weekday ?? "");
  const start_time = String(body.start_time ?? "");
  const end_time = String(body.end_time ?? "");
  const classroom = String(body.classroom ?? "").trim() || null;
  const location = String(body.location ?? "").trim() || null;
  const commission = String(body.commission ?? "").trim() || null;
  const notes = String(body.notes ?? "").trim() || null;
  const noTime = !weekday && !start_time && !end_time;
  if ((!noTime && (!weekDays.some(day => day === weekday) || timeMinutes(start_time) == null || timeMinutes(end_time) == null || timeMinutes(end_time)! <= timeMinutes(start_time)!)) ||
    (classroom?.length ?? 0) > 120 || (location?.length ?? 0) > 160 || (commission?.length ?? 0) > 80 || (notes?.length ?? 0) > 2000) return null;
  return { weekday: weekday || null, start_time: start_time || null, end_time: end_time || null, classroom, location, commission, notes };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para organizar tu agenda." }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const subjectId = String(body.subjectId ?? "");
  if (!subjectId || subjectId.length > 80) return NextResponse.json({ error: "Materia inválida." }, { status: 400 });
  const supabase = await createClient();
  const [{ data: profile }, { data: subject }] = await Promise.all([
    supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle(),
    supabase.from("subjects").select("id,name,curriculum").eq("id", subjectId).maybeSingle(),
  ]);
  if (!profile?.curriculum || !subject || subject.curriculum !== profile.curriculum) return NextResponse.json({ error: "La materia no corresponde a tu plan." }, { status: 422 });
  const period = currentAcademicPeriod();
  const fields = manualFields(body);
  if (!fields) return NextResponse.json({ error: "Elegí día, inicio y fin válidos." }, { status: 400 });
  const { data, error } = await supabase.from("user_course_entries").insert({ user_id: user.id, subject_id: subjectId, subject_name: subject.name, academic_year: period.academicYear, semester: period.semester, ...fields }).select("id").single();
  if (error) return NextResponse.json({ error: "No pudimos agregar la cursada." }, { status: 422 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para editar tu agenda." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id), fields = manualFields(body);
  if (!Number.isSafeInteger(id) || id < 1 || !fields) return NextResponse.json({ error: "Cursada inválida." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_course_entries").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No pudimos editar la cursada." }, { status: 422 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Iniciá sesión para editar tu agenda." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ error: "Cursada inválida." }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_course_entries").delete().eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ error: "No pudimos quitar la cursada." }, { status: 422 });
  return NextResponse.json({ ok: true });
}
