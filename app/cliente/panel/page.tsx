export default function ClientePanelPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
            Portal de clientes
          </p>
          <h1 className="mt-3 text-3xl font-bold">Bienvenido</h1>
          <p className="mt-2 text-slate-300">
            Aquí podrás revisar el estado de tus órdenes de servicio técnico.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-orange-400">Orden</p>
            <h2 className="mt-2 text-xl font-bold">MJ-2026-001</h2>
            <p className="mt-2 text-sm text-slate-300">
              Winche eléctrico 5 toneladas
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-orange-400">Estado</p>
            <h2 className="mt-2 text-xl font-bold">En revisión</h2>
            <p className="mt-2 text-sm text-slate-300">
              Equipo en diagnóstico técnico.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold text-orange-400">Última actualización</p>
            <h2 className="mt-2 text-xl font-bold">20-04-2026</h2>
            <p className="mt-2 text-sm text-slate-300">
              Recepción registrada y revisión iniciada.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}