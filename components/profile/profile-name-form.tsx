"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/profile/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos guardar el nombre.");
      setName(result.name);
      setMessage("Nombre actualizado.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar el nombre.");
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={save} className="mt-5">
    <label htmlFor="profile-name" className="block text-sm font-bold">Nombre visible</label>
    <p className="mt-1 text-xs text-cronopios-ink/60">Así aparece tu nombre en Mesita Virtual.</p>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
      <input id="profile-name" className="input min-w-0 flex-1" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
      <button type="submit" className="button-primary min-h-11 disabled:opacity-60" disabled={saving}>{saving ? "Guardando..." : "Guardar nombre"}</button>
    </div>
    {message && <p role="status" className="mt-2 text-sm text-green-700">{message}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </form>;
}
