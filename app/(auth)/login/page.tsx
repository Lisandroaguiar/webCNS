"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { BrandMark } from "@/components/brand/brand-mark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) setError(error.message); else {
      const next = new URLSearchParams(window.location.search).get("next");
      const destination = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(destination as Route);
      router.refresh();
    }
    setLoading(false);
  }
  return <section className="w-full max-w-md">
    <BrandMark href="/" light />
    <div className="mt-8 border-2 border-cronopios-ink bg-cronopios-paper p-7 shadow-[6px_6px_0_0_#19F094] md:p-9"><p className="text-sm text-ink/60">Qué bueno verte de nuevo</p><h1 className="mt-2 font-display text-3xl font-bold">Iniciar sesión</h1>
      <form onSubmit={submit} className="mt-7 space-y-4"><input className="input" type="email" placeholder="Email universitario" value={email} onChange={e => setEmail(e.target.value)} required /><input className="input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />{error && <p className="text-sm text-red-600">{error}</p>}<button className="button-primary w-full" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button></form>
      <p className="mt-6 text-center text-sm text-ink/60">¿Todavía no tenés cuenta? <Link href="/registro" className="font-semibold text-coral">Registrate</Link></p>
    </div>
  </section>;
}
