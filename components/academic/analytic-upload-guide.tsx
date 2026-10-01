import type { AcademicDocumentType, ParsedAnalytic } from "@/lib/academic/analytic-parser";

const route = ["SIU Guaraní", "Trámites", "Constancias y certificados", "Analítico con regularizadas"];
const orientationLabels: Record<string, string> = {
  dibujo: "Dibujo", pintura: "Pintura", ceramica: "Cerámica", escultura: "Escultura", escenografia: "Escenografía",
  grabado_arte_impreso: "Grabado y Arte Impreso", muralismo_arte_publico_monumental: "Muralismo y Arte Público Monumental",
};

export function academicMatchLabel(kind: string) {
  return ["EXACT", "ALIAS", "CONTEXT"].includes(kind) ? "Reconocida" : "Necesita revisión";
}

function AcademicDocumentRoute() {
  return <ol aria-label="Ruta para descargar el analítico en SIU Guaraní" className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1 text-xs font-semibold leading-snug sm:text-sm">
    {route.map((step, index) => <li key={step} className="flex items-center gap-1"><span className={index === route.length - 1 ? "font-black text-cronopios-magenta" : ""}>{step}</span>{index < route.length - 1 && <span aria-hidden="true" className="px-0.5 text-ink/50">→</span>}</li>)}
  </ol>;
}

export function AnalyticUploadGuide() {
  return <div className="min-w-0 border-l-4 border-cronopios-magenta bg-[#fffdf9] px-3 py-2 text-ink">
    <p className="text-xs font-black uppercase tracking-wide">Antes de subir tu analítico</p>
    <p className="mt-1 text-sm">Para reconocer bien tus materias, descargá este PDF desde SIU Guaraní:</p>
    <AcademicDocumentRoute />
    <p className="mt-2 text-xs">Descargalo y subilo acá.</p>
  </div>;
}

export function AnalyticUploadCaution() {
  return <div className="mt-2 text-xs text-ink/65">
    <p><strong>Importante:</strong> Usá “Analítico con regularizadas”. Historia Académica y otras constancias pueden tener otro formato y quizá no se reconozcan bien.</p>
    <details className="mt-1"><summary className="cursor-pointer font-semibold underline underline-offset-2">¿No encontrás esa opción?</summary><p className="mt-1">Entrá a SIU Guaraní desde el navegador y buscá:</p><AcademicDocumentRoute /><p className="mt-1">No hace falta modificar el PDF antes de subirlo.</p></details>
  </div>;
}

export function AnalyticDocumentNotice({ documentType, subjectsFound, textPresent, onTry, onChooseAnother }: {
  documentType: AcademicDocumentType; subjectsFound: number; textPresent?: boolean; onTry?: () => void; onChooseAnother: () => void;
}) {
  const canTry = subjectsFound > 0 && documentType !== "ANALYTIC_WITH_REGULARIZED";
  if (documentType === "ANALYTIC_WITH_REGULARIZED") return <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">✓ Documento reconocido · Analítico con regularizadas</p>;
  const message = textPresent === false
    ? "Este PDF no tiene texto seleccionable. Si es un escaneo, descargá el PDF original desde SIU Guaraní."
    : documentType === "ACADEMIC_HISTORY"
    ? "Este archivo parece ser una Historia Académica y no el Analítico con regularizadas. Podemos intentar leerlo, pero algunos datos podrían no reconocerse correctamente."
    : documentType === "UNKNOWN_SIU_DOCUMENT"
      ? "No pudimos confirmar qué tipo de documento de SIU es. Recomendamos descargar el Analítico con regularizadas."
      : subjectsFound > 0
        ? "No pudimos confirmar que sea un analítico de SIU. Encontramos algunas filas académicas; podés probar, pero revisá cada materia antes de guardar."
        : "No pudimos reconocer este archivo como un analítico académico compatible. Para mejores resultados usá el Analítico con regularizadas de SIU Guaraní.";
  return <div role="status" className="mt-3 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm">
    <p>{message}</p>
    {documentType !== "ACADEMIC_HISTORY" && <AcademicDocumentRoute />}
    <div className="mt-3 flex flex-wrap gap-2">{canTry && onTry && <button type="button" className="button-secondary" onClick={onTry}>Probar igualmente</button>}<button type="button" className="button-secondary" onClick={onChooseAnother}>Elegir otro archivo</button></div>
  </div>;
}

export function AnalyticRecognition({ parsed }: { parsed: Pick<ParsedAnalytic, "documentType" | "detectedProgramFamily" | "detectedPlanYear" | "detectedOrientation"> }) {
  if (parsed.documentType !== "ANALYTIC_WITH_REGULARIZED") return null;
  return <div role="status" className="mt-3 text-sm"><p className="font-semibold text-emerald-800">✓ Documento reconocido · Analítico con regularizadas</p>
    {(parsed.detectedProgramFamily || parsed.detectedPlanYear) && <p>{[parsed.detectedProgramFamily, parsed.detectedPlanYear ? `Plan ${parsed.detectedPlanYear}` : null].filter(Boolean).join(" · ")}</p>}
    {parsed.detectedOrientation && <p>Orientación: {orientationLabels[parsed.detectedOrientation] ?? parsed.detectedOrientation.replaceAll("_", " ")}</p>}
  </div>;
}
