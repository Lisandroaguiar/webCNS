import { ScrapbookCard } from "@/components/ScrapbookCard";

const posts = [
  { title: "Asamblea abierta de estudiantes", eventType: "asamblea", date: "JUE 18", description: "Nos encontramos para conversar sobre cursadas, becas y próximos proyectos.", accent: "fuchsia" as const },
  { title: "Muestra colectiva: Interfaces", eventType: "cultura", date: "VIE 26", description: "Galería de la Facultad · entrada libre.", accent: "cyan" as const },
  { title: "Inscripción a mesas de finales", eventType: "aviso", date: "HASTA 30", accent: "lime" as const }
];

export default function ComunidadPage() {
  return (
    <main className="min-h-screen bg-paper p-6 text-black md:p-12">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.25em]">Cronopios / cartelera</p>
        <h1 className="mt-4 font-mono text-5xl font-bold leading-none">Lo que pasa, pasa por acá.</h1>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {posts.map((post) => <ScrapbookCard key={post.title} {...post} />)}
        </div>
      </div>
    </main>
  );
}
