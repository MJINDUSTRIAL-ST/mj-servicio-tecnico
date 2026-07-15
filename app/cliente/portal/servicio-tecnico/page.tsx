"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type EstadoCliente =
  | "Ingreso"
  | "Diagnóstico"
  | "Cotización"
  | "Aprobada"
  | "Rechazada"
  | "En reparación"
  | "Listo para entrega"
  | "Entregado";

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

type ClientePortal = {
  id: string;
};

const PASOS_BASE = [
  "Ingreso",
  "Diagnóstico",
  "Cotización",
  "Aprobada / Rechazada",
  "En reparación / Trabajo",
  "Listo para entrega",
  "Entregado",
];

const indicePorEstado: Record<EstadoCliente, number> = {
  Ingreso: 0,
  Diagnóstico: 1,
  Cotización: 2,
  Aprobada: 3,
  Rechazada: 3,
  "En reparación": 4,
  "Listo para entrega": 5,
  Entregado: 6,
};

function normalizarEstadoCliente(estado?: string | null): EstadoCliente {
  if (!estado) return "Ingreso";

  const texto = estado
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (texto.includes("entregado")) return "Entregado";
  if (texto.includes("listo")) return "Listo para entrega";
  if (texto.includes("rechaz")) return "Rechazada";
  if (texto.includes("aprob")) return "Aprobada";

  if (
    texto.includes("trabajo") ||
    texto.includes("mantenimiento") ||
    texto.includes("mant.") ||
    texto.includes("reparacion") ||
    texto.includes("repar.")
  ) {
    return "En reparación";
  }

  if (texto.includes("cotizacion") || texto.includes("comercial")) {
    return "Cotización";
  }

  if (
    texto.includes("diagnostico") ||
    texto.includes("checklist") ||
    texto.includes("revision") ||
    texto.includes("jefe")
  ) {
    return "Diagnóstico";
  }

  if (texto.includes("ingreso") || texto.includes("ingresada")) {
    return "Ingreso";
  }

  return "Ingreso";
}

function pasosCliente(estadoActual: EstadoCliente) {
  return PASOS_BASE.map((paso, index) => {
    if (index === 3) {
      if (estadoActual === "Rechazada") return "Rechazada";

      if (
        estadoActual === "Aprobada" ||
        estadoActual === "En reparación" ||
        estadoActual === "Listo para entrega" ||
        estadoActual === "Entregado"
      ) {
        return "Aprobada";
      }
    }

    return paso;
  });
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function colorEstado(estado: EstadoCliente) {
  if (estado === "Ingreso") return "bg-slate-100 text-slate-700";
  if (estado === "Diagnóstico") return "bg-blue-50 text-blue-800";
  if (estado === "Cotización") return "bg-yellow-50 text-yellow-800";
  if (estado === "Aprobada") return "bg-green-50 text-green-800";
  if (estado === "Rechazada") return "bg-red-50 text-red-800";
  if (estado === "En reparación") return "bg-orange-50 text-orange-800";
  if (estado === "Listo para entrega") return "bg-emerald-50 text-emerald-800";
  if (estado === "Entregado") return "bg-slate-900 text-white";

  return "bg-slate-100 text-slate-700";
}

function colorPunto({
  index,
  pasoActual,
  estadoActual,
}: {
  index: number;
  pasoActual: number;
  estadoActual: EstadoCliente;
}) {
  if (estadoActual === "Rechazada" && index === pasoActual) {
    return "bg-red-600";
  }

  if (index <= pasoActual) {
    return "bg-blue-600";
  }

  return "bg-slate-300";
}

function colorLinea(estadoActual: EstadoCliente) {
  if (estadoActual === "Rechazada") return "bg-red-600";
  return "bg-blue-600";
}

export default function ClienteServicioTecnicoPage() {
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarOrdenes();
  }, []);

  async function cargarOrdenes() {
    const clienteEmail = localStorage
      .getItem("cliente_email")
      ?.trim()
      .toLowerCase();

    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    setLoading(true);

    const { data: ordenesDirectas, error: errorDirectas } = await supabase
      .from("ordenes")
      .select("*")
      .eq("cliente_email", clienteEmail)
      .order("created_at", { ascending: false });

    if (errorDirectas) {
      console.error(errorDirectas);
      alert("Error cargando órdenes: " + errorDirectas.message);
      setOrdenes([]);
      setLoading(false);
      return;
    }

    let ordenesPorAcceso: Orden[] = [];

    const { data: clienteActual } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", clienteEmail)
      .maybeSingle();

    const clientePortal = clienteActual as ClientePortal | null;

    if (clientePortal?.id) {
      const { data: accesos } = await supabase
        .from("orden_clientes_acceso")
        .select("orden_id")
        .eq("cliente_id", clientePortal.id);

      const ordenIds = (accesos || [])
        .map((acceso: any) => acceso.orden_id)
        .filter(Boolean);

      if (ordenIds.length > 0) {
        const { data: ordenesAcceso, error: errorAccesos } = await supabase
          .from("ordenes")
          .select("*")
          .in("id", ordenIds);

        if (!errorAccesos) {
          ordenesPorAcceso = (ordenesAcceso || []) as Orden[];
        }
      }
    }

    const mapa = new Map<string, Orden>();

    [...((ordenesDirectas || []) as Orden[]), ...ordenesPorAcceso].forEach(
      (orden) => {
        if (orden.id) mapa.set(orden.id, orden);
      }
    );

    const ordenesFinales = Array.from(mapa.values()).sort((a, b) => {
      const fechaA = new Date(a.created_at || "").getTime() || 0;
      const fechaB = new Date(b.created_at || "").getTime() || 0;
      return fechaB - fechaA;
    });

    setOrdenes(ordenesFinales);
    setLoading(false);
  }

  const resumen = useMemo(() => {
    return {
      total: ordenes.length,
      ingreso: ordenes.filter(
        (o) => normalizarEstadoCliente(o.estado) === "Ingreso"
      ).length,
      diagnostico: ordenes.filter(
        (o) => normalizarEstadoCliente(o.estado) === "Diagnóstico"
      ).length,
      cotizacion: ordenes.filter(
        (o) => normalizarEstadoCliente(o.estado) === "Cotización"
      ).length,
      resultado: ordenes.filter((o) => {
        const estado = normalizarEstadoCliente(o.estado);
        return estado === "Aprobada" || estado === "Rechazada";
      }).length,
      trabajo: ordenes.filter(
        (o) => normalizarEstadoCliente(o.estado) === "En reparación"
      ).length,
      listas: ordenes.filter(
        (o) => normalizarEstadoCliente(o.estado) === "Listo para entrega"
      ).length,
      entregadas: ordenes.filter(
        (o) => normalizarEstadoCliente(o.estado) === "Entregado"
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

      <div className="mt-6 grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <ResumenCard titulo="Total" valor={resumen.total} clase="bg-slate-50" />
        <ResumenCard titulo="Ingreso" valor={resumen.ingreso} clase="bg-slate-50" />
        <ResumenCard titulo="Diagnóstico" valor={resumen.diagnostico} clase="bg-blue-50" />
        <ResumenCard titulo="Cotización" valor={resumen.cotizacion} clase="bg-yellow-50" />
        <ResumenCard titulo="Aprob./Rech." valor={resumen.resultado} clase="bg-slate-50" />
        <ResumenCard titulo="Trabajo" valor={resumen.trabajo} clase="bg-orange-50" />
        <ResumenCard titulo="Listas" valor={resumen.listas} clase="bg-emerald-50" />
        <ResumenCard titulo="Entregadas" valor={resumen.entregadas} clase="bg-slate-100" />
      </div>

      {ordenes.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No tienes órdenes registradas.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {ordenes.map((orden) => {
            const estadoActual = normalizarEstadoCliente(orden.estado);
            const pasoActual = indicePorEstado[estadoActual];
            const pasos = pasosCliente(estadoActual);

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
                      className={`absolute left-0 top-2 h-1 ${colorLinea(
                        estadoActual
                      )}`}
                      style={{
                        width: `${(pasoActual / (pasos.length - 1)) * 100}%`,
                      }}
                    />

                    <div className="relative flex justify-between">
                      {pasos.map((paso, index) => (
                        <div
                          key={`${orden.id}-${paso}-${index}`}
                          className="flex w-full flex-col items-center"
                        >
                          <div
                            className={`h-5 w-5 rounded-full border-4 border-white ${colorPunto(
                              {
                                index,
                                pasoActual,
                                estadoActual,
                              }
                            )}`}
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