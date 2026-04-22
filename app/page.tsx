import Link from "next/link";
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 rounded-2xl border border-orange-500/30 bg-white px-6 py-4 shadow-lg">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            MJ Industrial
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600 md:text-base">
            Maquinaria y equipos de izaje
          </p>
        </div>

        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
          Portal de servicio técnico
        </p>

        <h2 className="max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">
          Seguimiento de órdenes y servicios en línea
        </h2>

        <p className="mt-6 max-w-2xl text-base text-slate-300 md:text-lg">
          Consulta el estado de tus equipos, revisa avances del servicio técnico
          y mantén toda la información centralizada en un solo lugar.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
         <Link
  href="/cliente"
  className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-400"
>
  Soy Cliente
</Link>

         <Link
  href="/personal"
  className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
>
  Personal MJ Industrial
</Link>
        </div>

        <div className="mt-14 grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-sm font-semibold text-orange-400">Órdenes</p>
            <h3 className="mt-2 text-xl font-bold">Seguimiento claro</h3>
            <p className="mt-2 text-sm text-slate-300">
              Visualiza el estado actual de cada equipo en servicio técnico.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-sm font-semibold text-orange-400">Evidencia</p>
            <h3 className="mt-2 text-xl font-bold">Fotos y avances</h3>
            <p className="mt-2 text-sm text-slate-300">
              Revisa imágenes, observaciones y actualizaciones del proceso.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <p className="text-sm font-semibold text-orange-400">Acceso</p>
            <h3 className="mt-2 text-xl font-bold">Portal para clientes</h3>
            <p className="mt-2 text-sm text-slate-300">
              Cada cliente podrá consultar únicamente sus propias órdenes.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}