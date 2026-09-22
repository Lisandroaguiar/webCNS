"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto min-h-screen max-w-2xl px-5 py-16"><div className="card"><p className="eyebrow">Algo salió mal</p><h1 className="mt-3 font-display text-3xl font-black">No pudimos cargar esta pantalla.</h1><p className="mt-3 text-ink/65">Revisá tu conexión e intentá nuevamente. Si tu sesión venció, volvé a ingresar.</p><button className="button-primary mt-6" onClick={reset}>Intentar de nuevo</button></div></main>;
}
