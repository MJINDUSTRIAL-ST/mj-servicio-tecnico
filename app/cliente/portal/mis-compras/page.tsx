import Link from "next/link";

export default function MisComprasPage() {
  const compras = [
    {
      numero: "VTA-20260409-003",
      producto: "mesa elevadora 500kg",
      descripcion: "Despacho a Antofagasta",
      estado: "Cotizada",
      certificado: {
        fecha: "13/04/2026",
        vencimiento: "13/10/2026",
      },
    },
    {
      numero: "VTA-20260409-002",
      producto: "mesa elevadora 500kg",
      descripcion: "Despacho a Antofagasta",
      estado: "Pendiente",
      certificado: {
        fecha: "08/03/2026",
        vencimiento: "08/07/2026",
      },
    },
    {
      numero: "VTA-20260409-001",
      producto: "tecle manual 5ton",
      descripcion: "5m cadena mando + 5m cadena carga",
      estado: "Completada",
      certificado: {
        fecha: "06/03/2026",
        vencimiento: "06/09/2026",
      },
    },
  ];

  const cotizadas = compras.filter((c) => c.estado === "Cotizada");
  const pendientes = compras.filter((c) => c.estado === "Pendiente");
  const completadas = compras.filter((c) => c.estado === "Completada");

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-bold">Mis Compras</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-yellow-50 p-5">
          <p className="text-sm text-yellow-700">Cotizadas</p>
          <p className="text-3xl font-bold text-yellow-900">
            {cotizadas.length}
          </p>
        </div>

        <div className="rounded-2xl bg-blue-50 p-5">
          <p className="text-sm text-blue-700">Pendientes</p>
          <p className="text-3xl font-bold text-blue-900">
            {pendientes.length}
          </p>
        </div>

        <div className="rounded-2xl bg-green-50 p-5">
          <p className="text-sm text-green-700">Completadas</p>
          <p className="text-3xl font-bold text-green-900">
            {completadas.length}
          </p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-bold">Cotizadas</h2>

        {cotizadas.map((c) => (
          <Link
            key={c.numero}
            href={`/cliente/portal/mis-compras/${c.numero}`}
            className="mb-4 block rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h3 className="text-xl font-bold">{c.numero}</h3>
            <p className="font-semibold">{c.producto}</p>
            <p className="text-slate-500">{c.descripcion}</p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-blue-600">🏅 Certificado</p>
              <div className="mt-2 text-sm text-slate-600">
                <p>📅 Fecha test: {c.certificado.fecha}</p>
                <p className="mt-1">
                  📅 Vencimiento: {c.certificado.vencimiento}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-bold">Pendientes</h2>

        {pendientes.map((c) => (
          <Link
            key={c.numero}
            href={`/cliente/portal/mis-compras/${c.numero}`}
            className="mb-4 block rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h3 className="text-xl font-bold">{c.numero}</h3>
            <p className="font-semibold">{c.producto}</p>
            <p className="text-slate-500">{c.descripcion}</p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-blue-600">🏅 Certificado</p>
              <div className="mt-2 text-sm text-slate-600">
                <p>📅 Fecha test: {c.certificado.fecha}</p>
                <p className="mt-1">
                  📅 Vencimiento: {c.certificado.vencimiento}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-2xl font-bold">Completadas</h2>

        {completadas.map((c) => (
          <Link
            key={c.numero}
            href={`/cliente/portal/mis-compras/${c.numero}`}
            className="mb-6 block rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <h3 className="text-xl font-bold">{c.numero}</h3>
            <p className="font-semibold">{c.producto}</p>
            <p className="text-slate-500">{c.descripcion}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
              >
                📄 Factura
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
              >
                📄 Orden de Compra
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
              >
                📄 Ficha Técnica
              </button>
              <button
                type="button"
                className="rounded-lg bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
              >
                📄 Manual
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-blue-600">🏅 Certificado</p>
              <div className="mt-2 text-sm text-slate-600">
                <p>📅 Fecha test: {c.certificado.fecha}</p>
                <p className="mt-1">
                  📅 Vencimiento: {c.certificado.vencimiento}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}