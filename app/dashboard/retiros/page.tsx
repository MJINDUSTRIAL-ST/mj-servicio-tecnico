"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Retiro = {
  id: string;
  fecha_retiro: string | null;
  hora_retiro: string | null;
  estado: string | null;
  observaciones: string | null;
  tipo: string | null;
  referencia_id: string | null;
  cliente_nombre: string | null;
  cliente_email?: string | null;
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha + "T00:00:00").toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function colorEstado(estado?: string | null) {
  if (estado === "Retirado") return "bg-green-100 text-green-700";
  if (estado === "Confirmado") return "bg-yellow-100 text-yellow-700";
  if (estado === "No asistió") return "bg-red-100 text-red-700";
  return "bg-blue-100 text-blue-700";
}

export default function RetirosDashboardPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  useEffect(() => {
    cargarRetiros();
  }, []);

  async function cargarRetiros() {
    const { data, error } = await supabase
      .from("retiros")
      .select("*")
      .order("fecha_retiro", { ascending: true })
      .order("hora_retiro", { ascending: true });

    if (error) {
      alert("Error cargando retiros: " + error.message);
      setLoading(false);
      return;
    }

    setRetiros((data || []) as Retiro[]);
    setLoading(false);
  }

  async function marcarRetirado(id: string) {
    const confirmar = window.confirm(
      "¿Confirmar que el cliente ya retiró el producto?"
    );

    if (!confirmar) return;

    setGuardandoId(id);

    const { error } = await supabase
      .from("retiros")
      .update({ estado: "Retirado" })
      .eq("id", id);

    if (error) {
      alert("No se pudo marcar como retirado: " + error.message);
      setGuardandoId(null);
      return;
    }

    await cargarRetiros();
    setGuardandoId(null);
  }

  const hoy = new Date().toISOString().slice(0, 10);

  const resumen = useMemo(() => {
    return {
      total: retiros.length,
      hoy: retiros.filter((r) => r.fecha_retiro === hoy).length,
      pendientes: retiros.filter((r) => r.estado === "Agendado").length,
      retirados: retiros.filter((r) => r.estado === "Retirado").length,
    };
  }, [retiros, hoy]);

  return (
    <div className="p-8">
      <Link
        href="/dashboard/servicio-tecnico"
        className="mb-6 inline-flex text-sm font-semibold text-slate-500 hover:text-slate-700"
      >
        ← Dashboard
      </Link>

      <h1 className="text-3xl font-bold">Retiros Agendados</h1>

      <p className="mt-2 text-slate-500">Ventas y Servicio Técnico</p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <ResumenCard titulo="Total retiros" valor={resumen.total} />
        <ResumenCard titulo="Retiros hoy" valor={resumen.hoy} />
        <ResumenCard titulo="Pendientes" valor={resumen.pendientes} />
        <ResumenCard titulo="Retirados" valor={resumen.retirados} />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border bg-white">
        {loading ? (
          <div className="p-6 text-slate-500">Cargando...</div>
        ) : retiros.length === 0 ? (
          <div className="p-6 text-slate-500">
            No hay retiros agendados.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-slate-500">
                <th className="p-4">Fecha</th>
                <th className="p-4">Hora</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Observaciones</th>
                <th className="p-4">Detalle</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {retiros.map((retiro) => (
                <tr key={retiro.id} className="border-b">
                  <td className="p-4">{formatFecha(retiro.fecha_retiro)}</td>

                  <td className="p-4">{retiro.hora_retiro || "-"}</td>

                  <td className="p-4">
                    {retiro.cliente_nombre || retiro.cliente_email || "-"}
                  </td>

                  <td className="p-4 capitalize">
                    {retiro.tipo === "venta" ? "Venta" : "Servicio Técnico"}
                  </td>

                  <td className="p-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${colorEstado(
                        retiro.estado
                      )}`}
                    >
                      {retiro.estado || "Agendado"}
                    </span>
                  </td>

                  <td className="p-4">{retiro.observaciones || "-"}</td>

                  <td className="p-4">
                    {retiro.tipo === "venta" ? (
                      <Link
                        href={`/dashboard/ventas/${retiro.referencia_id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Ver venta
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/servicio-tecnico/${retiro.referencia_id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Ver orden
                      </Link>
                    )}
                  </td>

                  <td className="p-4">
                    {retiro.estado !== "Retirado" ? (
                      <button
                        type="button"
                        onClick={() => marcarRetirado(retiro.id)}
                        disabled={guardandoId === retiro.id}
                        className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-60"
                      >
                        {guardandoId === retiro.id
                          ? "Guardando..."
                          : "✓ Retirado"}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">
                        Retirado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-sm text-slate-500">{titulo}</p>
      <p className="mt-2 text-3xl font-bold">{valor}</p>
    </div>
  );
}