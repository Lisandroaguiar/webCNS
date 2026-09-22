export default function RecorridoLoading() {
  return <div aria-label="Cargando recorrido" className="space-y-6 animate-pulse">
    <div className="h-10 w-56 bg-cronopios-magenta/25" />
    <div className="h-44 border-2 border-ink bg-white shadow-[4px_4px_0_0_#221E21]" />
    {[0, 1, 2].map(item => <div key={item} className="h-28 border-2 border-ink bg-cronopios-paper" />)}
  </div>;
}
