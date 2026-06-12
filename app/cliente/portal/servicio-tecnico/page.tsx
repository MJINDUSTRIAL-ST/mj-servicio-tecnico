"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Orden = {
  id: string;
  codigo?: string | null;
  cliente?: string | null;
  equipo?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  created_at?: string | null;
  cliente_email?: string | null;
  tecnico_responsable?: string | null;
};

const PASOS = [
  "Ingresada",
  "Diagnóstico",
  "Cotización",
  "Aprobada",
  "En reparación",
  "Listo p/Entrega",
  "Entregado",
];

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Ingresada";

  const texto = estado.trim().toLowerCase();

  if (texto === "ingreso") return "Ingresada";
  if (texto === "ingresada") return "Ingresada";

  if (texto === "diagnostico") return "Diagnóstico";
  if (texto === "diagnóstico") return "Diagnóstico";

  if (texto === "cotizacion") return "Cotización";
  if (texto === "cotización") return "Cotización";

  if (texto === "aprobada") return "Aprobada";

  if (texto === "reparacion") return "En reparación";
  if (texto === "reparación") return "En reparación";
  if (texto === "en reparación") return "En reparación";

  if (texto === "listo") return "Listo p/Entrega";
  if (texto === "listo p/entrega") return "Listo p/Entrega";

  if (texto === "entregado") return "Entregado";

  return estado;
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function colorEstado(estado?: string | null) {
  const actual = normalizarEstado(estado);

  if (actual === "Ingresada") return "bg-slate-100 text-slate-700";
  if (actual === "Diagnóstico") return "bg-blue-50 text-blue-800";
  if (actual === "Cotización") return "bg-yellow-50 text-yellow-800";
  if (actual === "Aprobada") return "bg-indigo-50 text-indigo-800";
  if (actual === "En reparación") return "bg-orange-50 text-orange-800";
  if (actual === "Listo p/Entrega") return "bg-green-50 text-green-800";
  if (actual === "Entregado") return "bg-emerald-50 text-emerald-800";

  return "bg-slate-100 text-slate-700";
}

export default function ClienteServicioTecnicoPage() {
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarOrdenes();
  }, []);

  async function cargarOrdenes() {
    const clienteEmail = localStorage.getItem("cliente_email");

    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("ordenes")
      .select("*")
      .eq("cliente_email", clienteEmail.trim().toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error cargando órdenes: " + error.message);
      setOrdenes([]);
      setLoading(false);
      return;
    }

    setOrdenes((data || []) as Orden[]);
    setLoading(false);
  }

  const resumen = useMemo(() => {
    return {
      total: ordenes.length,
      ingresadas: ordenes.filter(
        (o) => normalizarEstado(o.estado) === "Ingresada"
      ).length,
      diagnostico: ordenes.filter(
        (o) => normalizarEstado(o.estado) === "Diagnóstico"
      ).length,
      cotizacion: ordenes.filter(
        (o) => normalizarEstado(o.estado) === "Cotización"
      ).length,
      listas: ordenes.filter(
        (o) => normalizarEstado(o.estado) === "Listo p/Entrega"
      ).length,
      entregadas: ordenes.filter(
        (o) => normalizarEstado(o.estado) === "Entregado"
      ).length,
    };
  }, [ordenes]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">Servicio Técnico</h1>
        <p className="mt-6 text-slate-500">Cargando órdenes...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-bold">Servicio Técnico</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <ResumenCard titulo="Total" valor={resumen.total} clase="bg-slate-50" />
        <ResumenCard titulo="Ingresadas" valor={resumen.ingresadas} clase="bg-slate-50" />
        <ResumenCard titulo="Diagnóstico" valor={resumen.diagnostico} clase="bg-blue-50" />
        <ResumenCard titulo="Cotización" valor={resumen.cotizacion} clase="bg-yellow-50" />
        <ResumenCard titulo="Listas" valor={resumen.listas} clase="bg-green-50" />
        <ResumenCard titulo="Entregadas" valor={resumen.entregadas} clase="bg-emerald-50" />
      </div>

      {ordenes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No tienes órdenes registradas.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {ordenes.map((orden) => {
            const estadoActual = normalizarEstado(orden.estado);
            const pasoActual = Math.max(PASOS.indexOf(estadoActual), 0);

            return (
              <Link
                key={orden.id}
                href={`/cliente/portal/servicio-tecnico/${orden.id}`}
                className="block rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">
                      {orden.codigo || "Orden sin código"}
                    </h2>

                    <p className="mt-2 text-lg font-medium text-slate-700">
                      {orden.equipo || "Equipo sin nombre"}
                    </p>

                    <div className="mt-5 grid gap-2 text-sm text-slate-500">
                      <p>
                        <strong>Fecha ingreso:</strong>{" "}
                        {formatFecha(orden.created_at)}
                      </p>

                      <p>
                        <strong>Responsable:</strong>{" "}
                        {orden.tecnico_responsable || "Pendiente"}
                      </p>

                      <p>
                        <strong>Prioridad:</strong>{" "}
                        {orden.prioridad || "Normal"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end">
                    <span
                      className={`rounded-full px-4 py-2 text-sm font-bold ${colorEstado(
                        estadoActual
                      )}`}
                    >
                      {estadoActual}
                    </span>

                    <span className="mt-4 text-sm font-semibold text-blue-600">
                      Ver detalle
                    </span>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute left-0 top-2 h-1 w-full bg-slate-200" />

                    <div
                      className="absolute left-0 top-2 h-1 bg-orange-500"
                      style={{
                        width: `${((pasoActual + 1) / PASOS.length) * 100}%`,
                      }}
                    />

                    <div className="relative flex justify-between">
                      {PASOS.map((paso, index) => (
                        <div key={paso} className="flex w-full flex-col items-center">
                          <div
                            className={`h-5 w-5 rounded-full border-4 border-white ${
                              index <= pasoActual ? "bg-orange-500" : "bg-slate-300"
                            }`}
                          />

                          <span
                            className={`mt-3 text-center text-xs ${
                              index <= pasoActual
                                ? "font-semibold text-slate-800"
                                : "text-slate-400"
                            }`}
                          >
                            {paso}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
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