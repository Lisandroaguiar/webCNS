export default function DashboardLoading() {
  return <div aria-label="Cargando inicio" className="space-y-6 animate-pulse">
    <div className="h-8 w-40 bg-cronopios-magenta/25" />
    <div className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map(item => <div key={item} className="h-36 border-2 border-ink bg-white shadow-[4px_4px_0_0_#221E21]" />)}
    </div>
    <div className="grid gap-5 md:grid-cols-2">
      <div className="h-52 border-2 border-ink bg-white" />
      <div className="h-52 border-2 border-ink bg-white" />
    </div>
  </div>;
}
