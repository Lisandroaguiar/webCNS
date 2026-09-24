import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Iniciá sesión para editar tu perfil." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Ingresá un nombre de entre 2 y 80 caracteres." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase.from("profiles")
    .update({ full_name: name })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (profileError || !profile) return NextResponse.json({ error: "No pudimos guardar el nombre. Intentá de nuevo." }, { status: 500 });

  const { error: metadataError } = await supabase.auth.updateUser({ data: { nombre: name } });
  if (metadataError) return NextResponse.json({ error: "El nombre se guardó, pero no pudimos actualizar la sesión. Recargá la página." }, { status: 500 });

  return NextResponse.json({ name });
}
