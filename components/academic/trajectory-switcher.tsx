"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";

export type TrajectoryOption = {
  id: string;
  label: string;
  degree: "licenciatura" | "profesorado";
  legacyCurriculum: "old" | "new" | null;
};

export function TrajectorySwitcher({ options, activeId }: { options: TrajectoryOption[]; activeId: string | null }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(activeId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { setSelectedId(activeId ?? ""); }, [activeId]);

  async function switchTrajectory(id: string) {
    if (!id || id === activeId || busy) return;
    const selected = options.find(option => option.id === id);
    if (!selected) return;
    setSelectedId(id);
    setBusy(true);
    setError("");
    const supabase = createClient();
    try {
      const { error: switchError } = await supabase.rpc("activate_user_enrollment", { selected_id: id });
      if (switchError) throw new Error("No pudimos cambiar la trayectoria. Intentá de nuevo.");
      if (selected.legacyCurriculum) {
        try {
          await saveAcademicProfile(supabase, selected.degree, selected.legacyCurriculum);
        } catch {
          if (activeId) await supabase.rpc("activate_user_enrollment", { selected_id: activeId });
          throw new Error("No pudimos actualizar el plan de Multimedia. La trayectoria anterior sigue activa.");
        }
      }
      router.refresh();
    } catch (caught) {
      setSelectedId(activeId ?? "");
      setError(caught instanceof Error ? caught.message : "No pudimos cambiar la trayectoria.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="card mb-6">
    <label htmlFor="active-trajectory" className="block font-display text-xl font-bold">Mi trayectoria</label>
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
      <select id="active-trajectory" aria-label="Cambiar trayectoria activa" className="input min-h-11 min-w-0 flex-1" value={selectedId} disabled={busy} onChange={event => void switchTrajectory(event.target.value)}>
        {!activeId && <option value="">Elegí una trayectoria</option>}
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <Link href="/dashboard/trayectorias" className="button-secondary shrink-0">Administrar trayectorias</Link>
    </div>
    {busy && <p role="status" className="mt-2 text-sm">Cambiando trayectoria…</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
