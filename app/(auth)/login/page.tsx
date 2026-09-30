"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { BrandMark } from "@/components/brand/brand-mark";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { safeNextPath } from "@/lib/auth/redirect";

function loginErrorMessage(message: string) {
  if (/invalid login credentials|invalid credentials/i.test(message)) return "Email o contraseña incorrectos.";
  if (/email not confirmed/i.test(message)) return "Confirmá tu email antes de iniciar sesión.";
  if (/rate limit|too many requests/i.test(message)) return "Hubo demasiados intentos. Esperá unos minutos y probá de nuevo.";
  return "No pudimos iniciar sesión. Intentá nuevamente.";
}

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "google_auth") {
      setError("No pudimos completar el ingreso con Google. Intentá de nuevo.");
    }
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        if (process.env.NODE_ENV === "development") console.error("Password login failed:", authError.code ?? "unknown");
        setError(loginErrorMessage(authError.message));
        return;
      }
      const { data: { user }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError || !user) {
        if (process.env.NODE_ENV === "development") console.error("Password login session verification failed:", sessionError?.code ?? "missing_user");
        setError("No pudimos confirmar tu sesión. Intentá nuevamente.");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(safeNextPath(next));
    } catch (caught) {
      if (process.env.NODE_ENV === "development") console.error("Password login request failed:", caught instanceof Error ? caught.name : "unknown");
      setError("No pudimos iniciar sesión. Revisá tu conexión e intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }
  return <section className="w-full max-w-md">
    <BrandMark href="/" light />
    <div className="mt-8 border-2 border-cronopios-ink bg-cronopios-paper p-7 shadow-[6px_6px_0_0_#19F094] md:p-9"><p className="text-sm text-ink/60">Qué bueno verte de nuevo</p><h1 className="mt-2 font-display text-3xl font-bold">Iniciar sesión</h1>
      <form onSubmit={submit} className="mt-7 space-y-4"><input className="input" type="email" placeholder="Email universitario" value={email} onChange={e => setEmail(e.target.value)} required /><input className="input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />{error && <p className="text-sm text-red-600">{error}</p>}<button className="button-primary w-full" disabled={loading}>{loading ? "Ingresando..." : "Ingresar"}</button></form>
      <GoogleSignInButton />
      <p className="mt-6 text-center text-sm text-ink/60">¿Todavía no tenés cuenta? <Link href="/registro" className="font-semibold text-coral">Registrate</Link></p>
    </div>
  </section>;
}
