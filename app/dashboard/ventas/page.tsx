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
  prioridad?: string | null;
  fecha_venta: string;
};

const ESTADOS_VENTA = [
  "Todas",
  "Cotizada",
  "Aprobada",
  "Preparación",
  "Despachado",
  "Entregado",
];

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Cotizada";
  if (estado === "Entregada") return "Entregado";
  return estado;
}

function colorEstado(estado?: string | null) {
  const actual = normalizarEstado(estado);

  if (actual === "Cotizada") return "bg-yellow-50 text-yellow-800";
  if (actual === "Aprobada") return "bg-blue-50 text-blue-800";
  if (actual === "Preparación") return "bg-orange-50 text-orange-800";
  if (actual === "Despachado") return "bg-indigo-50 text-indigo-800";
  if (actual === "Entregado") return "bg-emerald-50 text-emerald-800";

  return "bg-slate-100 text-slate-700";
}

function colorPrioridad(prioridad?: string | null) {
  const actual = prioridad?.toLowerCase() || "media";

  if (actual.includes("alta")) return "bg-red-50 text-red-700";
  if (actual.includes("baja")) return "bg-slate-100 text-slate-700";

  return "bg-yellow-50 text-yellow-700";
}

export default function VentasPage() {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todas");

  useEffect(() => {
    cargarVentas();

    const interval = setInterval(() => {
      cargarVentas();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  async function cargarVentas() {
    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setVentas((data || []) as Venta[]);
    }

    setLoading(false);
  }

  const resumen = useMemo(() => {
    return {
      total: ventas.length,
      cotizadas: ventas.filter(
        (v) => normalizarEstado(v.estado) === "Cotizada"
      ).length,
      aprobadas: ventas.filter(
        (v) => normalizarEstado(v.estado) === "Aprobada"
      ).length,
      preparacion: ventas.filter(
        (v) => normalizarEstado(v.estado) === "Preparación"
      ).length,
      despacho: ventas.filter(
        (v) =>
          normalizarEstado(v.estado) === "Despachado"
      ).length,
      entregadas: ventas.filter(
        (v) => normalizarEstado(v.estado) === "Entregado"
      ).length,
    };
  }, [ventas]);

  const ventasFiltradas = useMemo(() => {
    const texto = busqueda.toLowerCase().trim();

    return ventas.filter((venta) => {
      const estadoActual = normalizarEstado(venta.estado);

      const coincideEstado =
        filtroEstado === "Todas" ||
        estadoActual === filtroEstado ||
        (filtroEstado === "Despacho" &&
          (estadoActual === "Lista para despacho" ||
            estadoActual === "Despachado"));

      const coincideTexto =
        !texto ||
        venta.numero?.toLowerCase().includes(texto) ||
        venta.cliente?.toLowerCase().includes(texto) ||
        venta.cliente_email?.toLowerCase().includes(texto) ||
        venta.producto?.toLowerCase().includes(texto) ||
        estadoActual.toLowerCase().includes(texto) ||
        venta.prioridad?.toLowerCase().includes(texto);

      return coincideEstado && coincideTexto;
    });
  }, [busqueda, filtroEstado, ventas]);

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

      <div className="mb-5 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <ResumenCard titulo="Ventas totales" valor={resumen.total} clase="bg-slate-50" />
        <ResumenCard titulo="Cotizadas" valor={resumen.cotizadas} clase="bg-yellow-50" />
        <ResumenCard titulo="Aprobadas" valor={resumen.aprobadas} clase="bg-blue-50" />
        <ResumenCard titulo="Preparación" valor={resumen.preparacion} clase="bg-orange-50" />
        <ResumenCard titulo="Despacho" valor={resumen.despacho} clase="bg-indigo-50" />
        <ResumenCard titulo="Entregadas" valor={resumen.entregadas} clase="bg-emerald-50" />
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {["Todas", "Cotizada", "Aprobada", "Preparación", "Despacho", "Entregado"].map(
            (estado) => (
              <button
                key={estado}
                type="button"
                onClick={() => setFiltroEstado(estado)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filtroEstado === estado
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {estado}
              </button>
            )
          )}
        </div>

        <label className="mb-2 block text-sm font-semibold text-slate-600">
          Buscar venta
        </label>

        <input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por cliente, email, producto, estado, prioridad o N° venta..."
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
              <th className="px-6 py-4">Prioridad</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Acción</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  Cargando ventas...
                </td>
              </tr>
            ) : ventasFiltradas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                  No se encontraron ventas
                </td>
              </tr>
            ) : (
              ventasFiltradas.map((venta) => {
                const estadoActual = normalizarEstado(venta.estado);

                return (
                  <tr key={venta.id} className="border-t border-slate-100">
                    <td className="px-6 py-5 font-semibold">{venta.numero}</td>
                    <td className="px-6 py-5">{venta.cliente}</td>
                    <td className="px-6 py-5">{venta.producto}</td>

                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${colorEstado(
                          estadoActual
                        )}`}
                      >
                        {estadoActual}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${colorPrioridad(
                          venta.prioridad
                        )}`}
                      >
                        {venta.prioridad || "Media"}
                      </span>
                    </td>

                    <td className="px-6 py-5">{venta.fecha_venta}</td>

                    <td className="px-6 py-5">
                      <Link
                        href={`/dashboard/ventas/${venta.id}`}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: number;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${clase}`}>
      <p className="text-sm font-semibold text-slate-600">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}