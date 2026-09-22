export default function LoadingAdminCartelera() {
  return <main className="min-h-screen bg-cronopios-paper px-5 py-8 md:px-8">
    <div className="mx-auto max-w-6xl" role="status" aria-live="polite">
      <p className="eyebrow">Administración</p>
      <h1 className="mt-2 font-display text-4xl font-black">Cartelera</h1>
      <p className="mt-8 text-sm font-bold">Cargando publicaciones…</p>
    </div>
  </main>;
}
