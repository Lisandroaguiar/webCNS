export function AcademicStamp({ year }: { year: number }) {
  return <div role="status" className="academic-stamp pointer-events-none fixed bottom-24 left-1/2 z-[60] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 border-[3px] border-cronopios-magenta bg-cream px-5 py-3 text-center font-display text-lg font-black uppercase tracking-wide text-cronopios-magenta sm:bottom-8">
    {year}.º año completo
  </div>;
}
