"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Venta = {
  id: string;
  numero: string;
  cliente: string;
  producto: string;
  estado: string;
  fecha_venta: string;
};

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarVentas();
  }, []);

  async function cargarVentas() {
    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setVentas(data || []);
    }

    setLoading(false);
  }

  return (
    <div className="p-6">
      {/* Volver */}
      <Link
        href="/dashboard/servicio-tecnico"
        className="mb-6 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Volver al Dashboard
      </Link>

      {/* Header */}
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

      {/* Tabla */}
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
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  Cargando ventas...
                </td>
              </tr>
            ) : ventas.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No hay ventas registradas
                </td>
              </tr>
            ) : (
              ventas.map((venta) => (
                <tr
                  key={venta.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-6 py-5 font-semibold">
                    {venta.numero}
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
                    {venta.fecha_venta}
                  </td>

                  <td className="px-6 py-5">
                    <Link
                      href={`/cliente/portal/mis-compras/${venta.numero}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}