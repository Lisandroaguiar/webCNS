"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { BrandMark } from "@/components/brand/brand-mark";

export default function RegistroPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" }); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    const { data, error } = await createClient().auth.signUp({ email: form.email, password: form.password, options: { data: { nombre: form.name } } });
    if (error) {
      setError(error.message === "Database error saving new user"
        ? "Supabase no pudo crear el perfil del usuario. Aplicá la migración de corrección del trigger en el SQL Editor y volvé a intentar."
        : error.message);
    } else if (data.session) { router.replace("/dashboard"); router.refresh(); } else setMessage("Revisá tu email para confirmar la cuenta.");
  }
  return <section className="w-full max-w-md"><BrandMark href="/" light /><div className="mt-8 border-2 border-cronopios-ink bg-cronopios-paper p-7 shadow-[6px_6px_0_0_#19F094] md:p-9"><p className="text-sm text-ink/60">Empezá a organizar tu recorrido</p><h1 className="mt-2 font-display text-3xl font-bold">Crear cuenta</h1><form onSubmit={submit} className="mt-7 space-y-4"><input className="input" placeholder="Tu nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /><input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /><input className="input" type="password" minLength={6} placeholder="Contraseña (mínimo 6 caracteres)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />{error && <p className="text-sm text-red-600">{error}</p>}{message && <p className="text-sm text-green-700">{message}</p>}<button className="button-primary w-full">Registrarme</button></form><p className="mt-6 text-center text-sm text-ink/60">¿Ya tenés cuenta? <Link href="/login" className="font-semibold text-coral">Ingresá</Link></p></div></section>;
}
