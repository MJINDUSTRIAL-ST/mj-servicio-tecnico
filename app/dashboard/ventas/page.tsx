"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Venta = {
  id: string;
  numero: string;
  cliente: string;
  cliente_email?: string | null;
  producto: string;
  estado: string;
  fecha_venta: string;
};

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

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

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    if (!texto) return ventas;

    return ventas.filter((venta) => {
      return (
        venta.numero?.toLowerCase().includes(texto) ||
        venta.cliente?.toLowerCase().includes(texto) ||
        venta.cliente_email?.toLowerCase().includes(texto) ||
        venta.producto?.toLowerCase().includes(texto) ||
        venta.estado?.toLowerCase().includes(texto)
      );
    });
  }, [busqueda, ventas]);

  return (
    <div className="p-6">
      <Link
        href="/dashboard/servicio-tecnico"
        className="mb-6 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Volver al Dashboard
      </Link>

      <div className="mb-6 flex items-center justify-between gap-4">
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

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-2 block text-sm font-semibold text-slate-600">
          Buscar venta
        </label>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, email, producto, estado o N° venta..."
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
        />
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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Cargando ventas...
                </td>
              </tr>
            ) : ventasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No se encontraron ventas
                </td>
              </tr>
            ) : (
              ventasFiltradas.map((venta) => (
                <tr key={venta.id} className="border-t border-slate-100">
                  <td className="px-6 py-5 font-semibold">{venta.numero}</td>
                  <td className="px-6 py-5">{venta.cliente}</td>
                  <td className="px-6 py-5">{venta.producto}</td>

                  <td className="px-6 py-5">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                      {venta.estado}
                    </span>
                  </td>

                  <td className="px-6 py-5">{venta.fecha_venta}</td>

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