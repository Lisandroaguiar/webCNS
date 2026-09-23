import Image from "next/image";

export type FdaVariant = "david-pixel" | "moises-wave" | "david-grid" | "ink-cursor" | "david-timecode" | "moises-blueprint";

const plates: Record<FdaVariant, { figure: "david" | "moises"; inventory: string; signal: string; discipline: string }> = {
  "david-pixel": { figure: "david", inventory: "CALCO / 01", signal: "PX · 0110", discipline: "MULTIMEDIA" },
  "moises-wave": { figure: "moises", inventory: "CALCO / 02", signal: "L/R · −06 dB", discipline: "MÚSICA · SONIDO" },
  "david-grid": { figure: "david", inventory: "CALCO / 01", signal: "X 024 · Y 078", discipline: "DCV" },
  "ink-cursor": { figure: "david", inventory: "CALCO / 01", signal: "REG. 04 / 06", discipline: "PLÁSTICA · MULTI" },
  "david-timecode": { figure: "david", inventory: "CALCO / 01", signal: "01:24:06:18", discipline: "AUDIOVISUALES" },
  "moises-blueprint": { figure: "moises", inventory: "CALCO / 02", signal: "ESC. 1:20 · A-A", discipline: "DI · HISTORIA" },
};

export const fdaVariants = Object.keys(plates) as FdaVariant[];

export function FdaPlate({ variant, className = "" }: { variant: FdaVariant; className?: string }) {
  const plate = plates[variant];
  return <div aria-hidden="true" className={`fda-plate fda-plate--${variant} ${className}`}>
    <span className="fda-plate__registration fda-plate__registration--tl">+</span>
    <span className="fda-plate__registration fda-plate__registration--br">+</span>
    <span className="fda-plate__top">FDA / UNLP <span>ARCHIVO VIVO</span></span>
    <Image className="fda-plate__figure" src={`/identity/${plate.figure}-calco.svg`} alt="" width={260} height={300} priority />
    <span className="fda-plate__figure-label">{plate.figure === "david" ? "CABEZA DE DAVID" : "MOISÉS"} / CALCO</span>
    <span className="fda-plate__overlay" />
    <span className="fda-plate__signal">{plate.signal}</span>
    <span className="fda-plate__footer">{plate.inventory}<span>{plate.discipline}</span></span>
  </div>;
}

export function FdaDisciplineStrip({ className = "" }: { className?: string }) {
  return <p className={`fda-discipline-strip ${className}`} aria-label="Facultad de Artes: multimedia, audiovisuales, música, plástica, comunicación visual, diseño industrial, historia del arte y sonido">
    MULTI <span>✳</span> CINE <span>▣</span> MÚSICA <span>⌁</span> PLÁSTICA <span>✱</span> DCV <span>⌗</span> DI <span>⌁</span> HISTORIA <span>◈</span> SONIDO
  </p>;
}

export function FdaHomeHero({ name, variant }: { name: string; variant: FdaVariant }) {
  return <header className="fda-home-hero">
    <div className="fda-home-hero__copy">
      <p className="fda-home-hero__brand">MESITA VIRTUAL <span>por Cronopios</span></p>
      <p className="fda-home-hero__hello">HOLA, <strong>{name}</strong> ✦</p>
      <h1>HOY ANDAMOS<br /><em>POR ARTES.</em></h1>
      <p className="fda-home-hero__index">FDA · UNLP <span>DIAG. 78 / LA PLATA</span></p>
    </div>
    <FdaPlate variant={variant} className="fda-home-hero__plate" />
    <FdaDisciplineStrip className="fda-home-hero__strip" />
  </header>;
}
