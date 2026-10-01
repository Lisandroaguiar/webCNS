"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function SubjectDetailDialog({ title, onClose, closing = false, children }: { title: string; onClose: () => void; closing?: boolean; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-label={title} className={`academic-dialog__paper ${closing ? "academic-dialog__paper--closing" : ""} max-h-[92dvh] w-full overflow-y-auto border-2 border-ink bg-cream p-5 shadow-[5px_5px_0_0_#000] sm:max-w-lg sm:p-6`}>
      <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 font-display text-xl font-black [overflow-wrap:anywhere]">{title}</h3><button ref={closeRef} type="button" className="button-secondary shrink-0" onClick={onClose} aria-label="Cerrar detalle">Cerrar</button></div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  </div>;
}
