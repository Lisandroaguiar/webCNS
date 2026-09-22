"use client";

import { motion } from "framer-motion";

export type SubjectItemProps = {
  name: string;
  year?: number;
  isPassed: boolean;
  onToggle?: (passed: boolean) => void;
};

/**
 * El trazo amarillo se escala desde cero al aprobar una materia.
 * mix-blend-multiply conserva el efecto de resaltador sobre el papel.
 */
export function SubjectItem({ name, year, isPassed, onToggle }: SubjectItemProps) {
  return (
    <motion.label
      layout
      whileHover={{ x: 3 }}
      className="group flex cursor-pointer items-center gap-4 border-b-2 border-black/15 py-4"
    >
      <input
        type="checkbox"
        checked={isPassed}
        onChange={(event) => onToggle?.(event.target.checked)}
        className="peer sr-only"
        aria-label={`Marcar ${name} como ${isPassed ? "pendiente" : "aprobada"}`}
      />
      <span
        aria-hidden="true"
        className={`relative flex h-7 w-7 shrink-0 rotate-[-4deg] items-center justify-center border-2 border-black bg-white transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-fuchsia ${isPassed ? "bg-lime" : ""}`}
      >
        {isPassed && <span className="font-mono text-xl font-bold leading-none">✓</span>}
      </span>
      <span className="relative font-mono text-base font-bold">
        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ scaleX: isPassed ? 1 : 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          style={{ originX: 0 }}
          className="absolute inset-x-[-0.15rem] top-1/2 z-0 h-[0.8em] -translate-y-1/2 bg-lime mix-blend-multiply"
        />
        <span className="relative z-10">{name}</span>
      </span>
      {year && <span className="ml-auto font-mono text-xs text-black/55">AÑO {year}</span>}
    </motion.label>
  );
}
