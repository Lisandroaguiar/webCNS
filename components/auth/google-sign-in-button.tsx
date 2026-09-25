"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setLoading(true);
    setError("");
    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const next = requestedNext?.startsWith("/") && !requestedNext.startsWith("//") && !requestedNext.includes("\\")
      ? requestedNext
      : "/dashboard";
    const redirectTo = new URL("/auth/callback", window.location.origin);
    redirectTo.searchParams.set("next", next);
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo.toString() },
    });
    if (authError) {
      setError("No pudimos iniciar sesión con Google. Intentá de nuevo.");
      setLoading(false);
    }
  }

  return <div className="mt-6">
    <div className="mb-4 flex items-center gap-3 text-xs uppercase tracking-wide text-ink/50"><span className="h-px flex-1 bg-ink/20" />o<span className="h-px flex-1 bg-ink/20" /></div>
    <button className="button-secondary w-full" type="button" onClick={signIn} disabled={loading}>
      {loading ? "Conectando con Google..." : "Continuar con Google"}
    </button>
    {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </div>;
}
