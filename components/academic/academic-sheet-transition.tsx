"use client";

import { useEffect, useState, type ReactNode } from "react";

const storageKey = "mesita:trajectory-sheet";

export function markTrajectorySheetChange(id: string) {
  try { window.sessionStorage.setItem(storageKey, id); } catch { /* Storage is optional visual state. */ }
}

export function AcademicSheetTransition({ activeId, children }: { activeId: string | null; children: ReactNode }) {
  const [entering, setEntering] = useState(false);
  useEffect(() => {
    if (!activeId) return;
    try {
      if (window.sessionStorage.getItem(storageKey) !== activeId) return;
      window.sessionStorage.removeItem(storageKey);
    } catch { return; }
    setEntering(true);
    const timeout = window.setTimeout(() => setEntering(false), 300);
    return () => window.clearTimeout(timeout);
  }, [activeId]);
  return <div className={entering ? "academic-sheet-enter" : undefined}>{children}</div>;
}
