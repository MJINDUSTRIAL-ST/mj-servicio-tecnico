"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type Despacho = {
  id: string;
  cliente_email?: string | null;
  producto_equipo?: string | null;
  estado?: string | null;
  fecha_retiro?: string | null;
  hora_retiro?: string | null;
  observaciones?: string | null;
  created_at?: string | null;
  referencia_id?: string | null;
};

type Filtro = "Todos" | "Solicitado" | "Programado" | "Despachado" | "Entregado";

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";
  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function badgeEstado(estado?: string | null) {
  if (estado === "Solicitado") return "bg-blue-50 text-blue-800";
  if (estado === "Programado") return "bg-yellow-50 text-yellow-800";
  if (estado === "Despachado") return "bg-indigo-50 text-indigo-800";
  if (estado === "Entregado") return "bg-green-50 text-green-800";
  return "bg-slate-100 text-slate-700";
}

export default function DespachosPage() {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("Todos");

  useEffect(() => {
    cargarDespachos();
  }, []);

  async function cargarDespachos() {
    const { data, error } = await supabase
      .from("retiros")
      .select("*")
      .eq("tipo", "despacho")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setDespachos([]);
      setLoading(false);
      return;
    }

    setDespachos((data || []) as Despacho[]);
    setLoading(false);
  }

  const resumen = useMemo(() => {
    return {
      total: despachos.length,
      solicitados: despachos.filter((d) => d.estado === "Solicitado").length,
      programados: despachos.filter((d) => d.estado === "Programado").length,
      despachados: despachos.filter((d) => d.estado === "Despachado").length,
      entregados: despachos.filter((d) => d.estado === "Entregado").length,
    };
  }, [despachos]);

  const despachosFiltrados = useMemo(() => {
    if (filtro === "Todos") return despachos;
    return despachos.filter((d) => d.estado === filtro);
  }, [despachos, filtro]);

  async function programarDespacho(item: Despacho) {
    const fecha = prompt("Ingresa fecha de despacho (YYYY-MM-DD):");
    if (!fecha) return;

    const hora = prompt("Ingresa horario estimado de despacho (Ej: 10:00 - 13:00):");
    if (!hora) return;

    const { error } = await supabase
      .from("retiros")
      .update({
        estado: "Programado",
        fecha_retiro: fecha,
        hora_retiro: hora,
      })
      .eq("id", item.id);

    if (error) {
      alert("No se pudo programar el despacho.");
      console.error(error);
      return;
    }

    alert("Despacho programado correctamente.");
    await cargarDespachos();
  }

  async function cambiarEstado(id: string, estado: string) {
    const { error } = await supabase
      .from("retiros")
      .update({ estado })
      .eq("id", id);

    if (error) {
      alert("No se pudo actualizar el estado.");
      console.error(error);
      return;
    }

    await cargarDespachos();
  }

  if (loading) {
    return <main className="p-8">Cargando despachos...</main>;
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Despachos Solicitados</h1>
      <p className="mt-2 text-slate-500">Ventas con solicitud de despacho.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-5">
        <ResumenCard titulo="Total despachos" valor={resumen.total} activo={filtro === "Todos"} onClick={() => setFiltro("Todos")} />
        <ResumenCard titulo="Solicitados" valor={resumen.solicitados} activo={filtro === "Solicitado"} onClick={() => setFiltro("Solicitado")} />
        <ResumenCard titulo="Programados" valor={resumen.programados} activo={filtro === "Programado"} onClick={() => setFiltro("Programado")} />
        <ResumenCard titulo="Despachados" valor={resumen.despachados} activo={filtro === "Despachado"} onClick={() => setFiltro("Despachado")} />
        <ResumenCard titulo="Entregados" valor={resumen.entregados} activo={filtro === "Entregado"} onClick={() => setFiltro("Entregado")} />
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">
        Mostrando: {filtro === "Todos" ? "Todos los despachos" : filtro}
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">Fecha solicitud</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Fecha despacho</th>
              <th className="px-4 py-3">Horario</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {despachosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No hay despachos en este filtro.
                </td>
              </tr>
            ) : (
              despachosFiltrados.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-4 py-4">{formatFecha(item.created_at)}</td>
                  <td className="px-4 py-4">{item.cliente_email || "-"}</td>
                  <td className="px-4 py-4 font-semibold">{item.producto_equipo || "-"}</td>
                  <td className="px-4 py-4">{formatFecha(item.fecha_retiro)}</td>
                  <td className="px-4 py-4">{item.hora_retiro || "-"}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeEstado(item.estado)}`}>
                      {item.estado || "Solicitado"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {item.estado === "Solicitado" ? (
                        <button
                          onClick={() => programarDespacho(item)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700"
                        >
                          Programar
                        </button>
                      ) : null}

                      {item.estado === "Programado" ? (
                        <button
                          onClick={() => cambiarEstado(item.id, "Despachado")}
                          className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                        >
                          Despachado
                        </button>
                      ) : null}

                      {item.estado === "Despachado" ? (
                        <button
                          onClick={() => cambiarEstado(item.id, "Entregado")}
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white hover:bg-green-700"
                        >
                          Entregado
                        </button>
                      ) : null}

                      {item.estado === "Entregado" ? (
                        <span className="text-xs font-semibold text-slate-400">
                          Finalizado
                        </span>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function ResumenCard({
  titulo,
  valor,
  activo,
  onClick,
}: {
  titulo: string;
  valor: number;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition hover:shadow-md ${
        activo
          ? "border-blue-600 bg-blue-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-semibold text-slate-600">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{valor}</p>
    </button>
  );
}