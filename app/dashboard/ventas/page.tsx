"use client";

import Link from "next/link";

const ventas = [
  {
    id: "VTA-20260409-003",
    cliente: "Alexandra",
    producto: "Mesa elevadora 500kg",
    estado: "Cotizada",
    fecha: "13-05-2026",
  },
  {
    id: "VTA-20260409-002",
    cliente: "TECNASIC",
    producto: "Winche RT 5TON",
    estado: "Entregada",
    fecha: "10-05-2026",
  },
];

export default function VentasPage() {
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ventas</h1>
          <p className="text-slate-500">
            Administración de ventas y documentos.
          </p>
        </div>

        <Link
          href="/dashboard/ventas/nueva"
          className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          + Ingresar nueva venta
        </Link>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-sm text-slate-600">
              <th className="px-6 py-4">N° Venta</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Acción</th>
            </tr>
          </thead>

          <tbody>
            {ventas.map((venta) => (
              <tr
                key={venta.id}
                className="border-t border-slate-100"
              >
                <td className="px-6 py-5 font-semibold">
                  {venta.id}
                </td>

                <td className="px-6 py-5">
                  {venta.cliente}
                </td>

                <td className="px-6 py-5">
                  {venta.producto}
                </td>

                <td className="px-6 py-5">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                    {venta.estado}
                  </span>
                </td>

                <td className="px-6 py-5">
                  {venta.fecha}
                </td>

                <td className="px-6 py-5">
                  <Link
                    href={`/cliente/portal/mis-compras/${venta.id}`}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Ver
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}