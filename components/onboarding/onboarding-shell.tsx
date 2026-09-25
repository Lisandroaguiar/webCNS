"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, FileUp, Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";
import { saveUserSubject, type SubjectStatus } from "@/lib/supabase/mvp-queries";
import { curriculumOptions, degreeOptions, type CurriculumValue, type DegreeValue } from "@/lib/academic/curriculum";
import { matchAnalyticSubjects, type MatchedAnalyticSubject } from "@/lib/academic/match-analytic-subjects";
import { saveAcademicProfile } from "@/lib/supabase/academic-profile";
import { subjectsForDegree } from "@/lib/academic/degree-catalog";
import type { ParsedAnalytic } from "@/lib/academic/analytic-parser";
import { Tape } from "@/components/visual/paper";

type Subject = { id: string | number; name: string; code: string | null; year: number | null; curriculum: CurriculumValue };
type Step = "choose" | "manual" | "review";

export function OnboardingShell() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [step, setStep] = useState<Step>("choose");
  const [degree, setDegree] = useState<DegreeValue>("licenciatura");
  const [curriculum, setCurriculum] = useState<CurriculumValue>("old");
  const [file, setFile] = useState<File | null>(null);
  const [catalog, setCatalog] = useState<Subject[]>([]);
  const [parsed, setParsed] = useState<ParsedAnalytic | null>(null);
  const [matches, setMatches] = useState<MatchedAnalyticSubject[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("curriculum").eq("id", user.id).maybeSingle();
      const degreeValue = degreeOptions.find(option => option.profileValue === user.user_metadata?.degree)?.value;
      if (degreeValue) setDegree(degreeValue);
      if (data?.curriculum === "old" || data?.curriculum === "new") setCurriculum(data.curriculum);
    }
    void loadProfile();
  }, [supabase]);

  async function loadCatalog(value: CurriculumValue, selectedDegree: DegreeValue = degree) {
    const { data, error: catalogError } = await supabase.from("subjects").select("id, name, code, year, curriculum").eq("curriculum", value).order("year").order("name");
    if (catalogError) throw new Error("No pudimos cargar el plan de estudios.");
    const subjects = subjectsForDegree((data ?? []) as Subject[], selectedDegree, value);
    if (!subjects.length) throw new Error("Este plan todavía no tiene materias cargadas.");
    setCatalog(subjects);
    return subjects;
  }

  async function startManual() {
    setError(""); setMessage(""); setLoading(true);
    try {
      await loadCatalog(curriculum);
      await saveProfile();
      localStorage.setItem("cronopios-curriculum", curriculum);
      document.cookie = `cronopios-curriculum=${curriculum}; path=/; max-age=31536000; samesite=lax`;
      setStep("manual");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos preparar tu plan.");
    } finally { setLoading(false); }
  }

  async function saveProfile() {
    await saveAcademicProfile(supabase, degree, curriculum);
  }

  async function processPdf() {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Por ahora aceptamos únicamente el PDF generado por SIU Guaraní.");
      return;
    }
    setLoading(true); setError(""); setMessage("");
    try {
      const formData = new FormData(); formData.append("file", file);
      const response = await fetch("/api/parse-analitico", { method: "POST", body: formData });
      const payload = await response.json() as ParsedAnalytic & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "No pudimos leer este analítico. Probá con el PDF original de SIU Guaraní o cargá las materias a mano.");
      const result = payload;
      if (!result.subjects?.length) throw new Error("No pudimos encontrar materias en este analítico. Probá con el PDF original de SIU Guaraní o cargá las materias a mano.");
      const detectedDegree = result.detectedDegree;
      const detectedCurriculum = result.detectedCurriculum;
      if (detectedDegree) setDegree(detectedDegree);
      if (detectedCurriculum) setCurriculum(detectedCurriculum);
      const selectedCatalog = await loadCatalog(detectedCurriculum ?? curriculum, detectedDegree ?? degree);
      const nextMatches = matchAnalyticSubjects(result.subjects, selectedCatalog.map(subject => ({ id: subject.id, nombre: subject.name })));
      setParsed({ ...result, detectedDegree, detectedCurriculum, warnings: [...result.warnings, ...(nextMatches.some(item => !item.subjectId) ? ["Hay materias sin coincidencia en esta carrera y plan. Revisalas: pueden pertenecer a otra carrera o tener otro nombre."] : [])] });
      setMatches(nextMatches);
      setStep("review");
      if (!detectedDegree || !detectedCurriculum) setMessage("Revisá carrera y plan: no pudimos detectarlos con seguridad.");
      else setMessage("Analítico leído. Revisá las materias antes de guardar.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos leer este analítico.");
    } finally { setLoading(false); }
  }

  function updateMatch(index: number, subjectId: string) {
    setMatches(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, subjectId: subjectId || undefined, kind: subjectId ? "PROBABLE" : "UNMATCHED" } : item));
  }

  async function saveAnalytic() {
    setSaving(true); setError("");
    try {
      await saveProfile();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
      const selected = matches.filter(item => item.subjectId);
      if (!selected.length) throw new Error("Elegí al menos una materia para guardar.");
      const results = await Promise.all(selected.map(item => saveUserSubject(
        supabase, user.id, item.subjectId!, item.status ?? "passed" as SubjectStatus, item.grade, item.passedAt
      )));
      const failed = results.find(result => result.error);
      if (failed?.error) throw new Error("No pudimos guardar todas las materias. Revisá tu conexión e intentá nuevamente.");
      localStorage.setItem("cronopios-curriculum", curriculum);
      document.cookie = `cronopios-curriculum=${curriculum}; path=/; max-age=31536000; samesite=lax`;
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No pudimos guardar tu recorrido.");
    } finally { setSaving(false); }
  }

  return <section className="mx-auto w-full max-w-3xl">
    <p className="eyebrow">Primer paso</p>
    <h1 className="mt-2 font-display text-4xl font-black">Armemos tu recorrido</h1>
    <p className="mt-3 text-cronopios-ink/65">Podés subir tu analítico o empezar marcando las materias a mano.</p>
    {step === "choose" && <div className="mt-8 grid gap-4 md:grid-cols-2">
      <article className="relative border-2 border-cronopios-ink bg-cronopios-pink p-5 shadow-[5px_5px_0_0_#221E21]"><Tape className="-top-5 left-1/2 -translate-x-1/2" />
        <FileUp size={26} aria-hidden /><p className="mt-5 font-mono text-xs font-bold uppercase tracking-widest">Más rápido</p><h2 className="mt-2 font-display text-2xl font-black">Subir mi analítico</h2>
        <p className="mt-3 text-sm text-cronopios-ink/75">Por ahora funciona con el certificado PDF generado por SIU Guaraní.</p>
        <label className="mt-5 flex min-h-12 cursor-pointer items-center justify-center border-2 border-cronopios-ink bg-white px-3 py-3 text-center text-sm font-bold">
          {file ? file.name : "Seleccionar PDF"}
          <input className="sr-only" type="file" accept=".pdf,application/pdf" onChange={event => setFile(event.target.files?.[0] ?? null)} />
        </label>
        <button className="button-primary mt-3 w-full" disabled={!file || loading} onClick={() => void processPdf()}>{loading ? <><Loader2 className="animate-spin" size={18} /> Procesando...</> : <>Procesar analítico <ArrowRight size={18} /></>}</button>
        <p className="mt-4 text-xs text-cronopios-ink/65">Usamos el archivo para detectar tus materias.</p>
      </article>
      <article className="border-2 border-cronopios-ink bg-white p-5 shadow-[5px_5px_0_0_#221E21]">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-cronopios-magenta">Siempre podés cambiarlo</p><h2 className="mt-2 font-display text-2xl font-black">Cargar a mano</h2><p className="mt-3 text-sm text-cronopios-ink/65">Elegí tu carrera y plan para empezar con el recorrido vacío.</p>
        <label className="mt-5 block text-sm font-bold" htmlFor="onboarding-degree">Carrera</label><select id="onboarding-degree" className="input mt-2" value={degree} onChange={event => setDegree(event.target.value as DegreeValue)}>{degreeOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <label className="mt-4 block text-sm font-bold" htmlFor="onboarding-curriculum">Plan</label><select id="onboarding-curriculum" className="input mt-2" value={curriculum} onChange={event => setCurriculum(event.target.value as CurriculumValue)}>{curriculumOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        <button className="button-secondary mt-5 w-full" disabled={loading} onClick={() => void startManual()}>{loading ? "Preparando..." : "Empezar a mano"}</button>
      </article>
    </div>}
    {step === "manual" && <div className="card mt-8"><CheckCircle2 className="text-cronopios-magenta" /><h2 className="mt-3 font-display text-2xl font-black">Tu plan está listo</h2><p className="mt-2 text-sm text-cronopios-ink/65">Podés empezar a marcar materias desde Recorrido. Después podés modificar todo.</p><Link href="/dashboard/recorrido" prefetch className="button-primary mt-5 inline-block">Ir a Recorrido</Link></div>}
    {step === "review" && parsed && <div className="mt-8">
      <div className="border-2 border-cronopios-ink bg-white p-5 shadow-[4px_4px_0_0_#221E21]"><h2 className="font-display text-2xl font-black">Revisá tu analítico</h2><div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><p><strong>Carrera:</strong> {degreeOptions.find(option => option.value === degree)?.label ?? "No detectada"}</p><p><strong>Plan:</strong> {curriculumOptions.find(option => option.value === curriculum)?.label ?? "No detectado"}</p><p><strong>Reconocidas:</strong> {matches.filter(item => item.subjectId).length} de {matches.length}</p></div>{parsed.warnings.map(warning => <p key={warning} className="mt-4 flex gap-2 bg-yellow-100 p-3 text-sm"><TriangleAlert size={18} className="shrink-0" />{warning}</p>)}{parsed.reportedApprovedCount !== undefined && parsed.reportedApprovedCount !== matches.length && <p className="mt-4 bg-yellow-100 p-3 text-sm">El analítico indica {parsed.reportedApprovedCount} materias aprobadas, pero pudimos reconocer {matches.length}. Revisemos las que faltan.</p>}</div>
      <div className="mt-4 space-y-3">{matches.map((item, index) => <div key={`${item.rawName}-${index}`} className="border-2 border-cronopios-ink bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{item.rawName}</p><p className="mt-1 text-xs uppercase tracking-widest text-cronopios-magenta">{item.kind} · {item.status === "regular" ? "Regularizada" : item.status === "pending" ? "Pendiente" : "Aprobada"}{item.grade !== undefined ? ` · Nota ${item.grade}` : " · Nota no detectada"}</p>{item.passedAt && <p className="mt-1 text-xs text-cronopios-ink/55">{item.passedAt}</p>}</div><div className="flex w-full flex-col gap-2 sm:w-auto"><select className="input max-w-full sm:max-w-xs" aria-label={`Materia para ${item.rawName}`} value={item.subjectId ?? ""} onChange={event => updateMatch(index, event.target.value)}><option value="">Ignorar esta fila</option>{catalog.map(subject => <option key={subject.id} value={String(subject.id)}>{subject.name}</option>)}</select><select className="input max-w-full sm:max-w-xs" aria-label={`Estado para ${item.rawName}`} value={item.status ?? "passed"} onChange={event => setMatches(current => current.map((currentItem, currentIndex) => currentIndex === index ? { ...currentItem, status: event.target.value as "passed" | "regular" | "pending" } : currentItem))}><option value="passed">Aprobada</option><option value="regular">Regularizada</option><option value="pending">Pendiente</option></select></div></div></div>)}</div>
      <button className="button-primary sticky bottom-3 mt-5 w-full" disabled={saving} onClick={() => void saveAnalytic()}>{saving ? "Guardando..." : `Guardar ${matches.filter(item => item.subjectId).length} materias`}</button>
    </div>}
    {message && <p className="mt-5 bg-cronopios-green/40 p-3 text-sm font-bold">{message}</p>}
    {error && <div className="mt-5 bg-red-100 p-3 text-sm font-bold text-red-800">{error}<div className="mt-3 flex flex-wrap gap-3"><button className="underline" onClick={() => setError("")}>Intentar de nuevo</button><button className="underline" onClick={() => setStep("choose")}>Cargar materias a mano</button></div></div>}
    {step !== "choose" && <p className="mt-6 text-center text-sm text-cronopios-ink/55">Después podés modificar todo desde Recorrido.</p>}
  </section>;
}
