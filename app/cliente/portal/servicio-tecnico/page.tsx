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
  orden_padre_id?: string | null;
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

type GrupoOrden = {
  madre: Orden;
  hijos: Orden[];
  estadoResumen: EstadoCliente;
};

function ordenarPorFecha(a: Orden, b: Orden) {
  return (new Date(b.created_at || "").getTime() || 0) -
    (new Date(a.created_at || "").getTime() || 0);
}

function obtenerGrupos(ordenes: Orden[]): GrupoOrden[] {
  const porId = new Map(ordenes.map((orden) => [orden.id, orden]));
  const hijosPorMadre = new Map<string, Orden[]>();

  ordenes.forEach((orden) => {
    const madreId = orden.orden_padre_id;
    // Agrupar solo si la orden madre también está autorizada para este cliente.
    if (madreId && porId.has(madreId)) {
      const actuales = hijosPorMadre.get(madreId) || [];
      actuales.push(orden);
      hijosPorMadre.set(madreId, actuales);
    }
  });

  const grupos: GrupoOrden[] = [];
  ordenes.forEach((orden) => {
    // El hijo aparece dentro de su madre, no como una tarjeta independiente.
    if (orden.orden_padre_id && porId.has(orden.orden_padre_id)) return;

    const hijos = (hijosPorMadre.get(orden.id) || []).sort((a, b) =>
      (a.codigo || "").localeCompare(b.codigo || "", "es", { numeric: true })
    );

    // Si los equipos llevan ritmos distintos, el lote se considera en su
    // etapa menos avanzada. El estado real de cada equipo permanece visible.
    const estados = hijos.length ? hijos.map((hijo) => normalizarEstadoCliente(hijo.estado)) : [normalizarEstadoCliente(orden.estado)];
    const estadoResumen = estados.reduce((anterior, actual) =>
      indicePorEstado[actual] < indicePorEstado[anterior] ? actual : anterior
    );

    grupos.push({ madre: orden, hijos, estadoResumen });
  });

  return grupos.sort((a, b) => ordenarPorFecha(a.madre, b.madre));
}

function BarraAvance({ estado }: { estado: EstadoCliente }) {
  const pasoActual = indicePorEstado[estado];
  const pasos = pasosCliente(estado);
  return (
    <div className="mt-8 overflow-x-auto">
      <div className="relative min-w-[570px]">
        <div className="absolute left-0 top-2 h-1 w-full bg-slate-200" />
        <div
          className={`absolute left-0 top-2 h-1 ${colorLinea(estado)}`}
          style={{ width: `${(pasoActual / (pasos.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {pasos.map((paso, index) => (
            <div key={`${paso}-${index}`} className="flex w-full flex-col items-center">
              <div
                className={`h-5 w-5 rounded-full border-4 border-white ${colorPunto({
                  index,
                  pasoActual,
                  estadoActual: estado,
                })}`}
              />
              <span
                className={`mt-3 text-center text-xs ${
                  index <= pasoActual ? "font-semibold text-slate-800" : "text-slate-400"
                }`}
              >
                {paso}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClienteServicioTecnicoPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarOrdenes();
  }, []);

  async function cargarOrdenes() {
    const clienteEmail = localStorage.getItem("cliente_email")?.trim().toLowerCase();
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
        if (!errorAccesos) ordenesPorAcceso = (ordenesAcceso || []) as Orden[];
      }
    }

    const mapa = new Map<string, Orden>();
    [...((ordenesDirectas || []) as Orden[]), ...ordenesPorAcceso].forEach((orden) => {
      if (orden.id) mapa.set(orden.id, orden);
    });
    setOrdenes(Array.from(mapa.values()).sort(ordenarPorFecha));
    setLoading(false);
  }

  const grupos = useMemo(() => obtenerGrupos(ordenes), [ordenes]);
  const resumen = useMemo(() => {
    const contar = (estado: EstadoCliente) =>
      grupos.filter((grupo) => grupo.estadoResumen === estado).length;
    return {
      total: grupos.length,
      ingreso: contar("Ingreso"),
      diagnostico: contar("Diagnóstico"),
      cotizacion: contar("Cotización"),
      resultado: contar("Aprobada") + contar("Rechazada"),
      trabajo: contar("En reparación"),
      listas: contar("Listo para entrega"),
      entregadas: contar("Entregado"),
    };
  }, [grupos]);

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
      <p className="mt-3 text-xs text-slate-500">
        Los contadores representan órdenes de servicio. Cada lote cuenta una vez y sus equipos mantienen seguimiento individual.
      </p>

      {grupos.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No tienes órdenes registradas.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {grupos.map(({ madre, hijos, estadoResumen }) => (
            <div
              key={madre.id}
              className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {madre.codigo || "Orden sin código"}
                  </h2>
                  <p className="mt-2 text-lg font-medium text-slate-700">
                    {hijos.length ? `Lote de ${hijos.length} equipos` : madre.equipo || "Equipo sin nombre"}
                  </p>
                  <div className="mt-5 grid gap-2 text-sm text-slate-500">
                    <p><strong>Fecha ingreso:</strong> {formatFecha(madre.created_at)}</p>
                    {!hijos.length && (
                      <>
                        <p><strong>Responsable:</strong> {madre.tecnico_responsable || "Pendiente"}</p>
                        <p><strong>Prioridad:</strong> {madre.prioridad || "Normal"}</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-start lg:items-end">
                  <span className={`rounded-full px-4 py-2 text-sm font-bold ${colorEstado(estadoResumen)}`}>
                    {estadoResumen}
                  </span>
                  <Link
                    href={`/cliente/portal/servicio-tecnico/${madre.id}`}
                    className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Ver detalle {hijos.length ? "del lote" : ""}
                  </Link>
                </div>
              </div>

              {hijos.length > 0 && (
                <div className="mt-6 grid gap-3 border-t border-slate-200 pt-5 md:grid-cols-2">
                  {hijos.map((hijo) => {
                    const estado = normalizarEstadoCliente(hijo.estado);
                    return (
                      <Link
                        key={hijo.id}
                        href={`/cliente/portal/servicio-tecnico/${hijo.id}`}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-slate-900">{hijo.codigo || "Equipo"}</p>
                            <p className="mt-1 text-sm text-slate-600">{hijo.equipo || "Equipo sin nombre"}</p>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-xs font-bold ${colorEstado(estado)}`}>
                            {estado}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-blue-600">Ver detalle del equipo</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <BarraAvance estado={estadoResumen} />
              {hijos.length > 0 && (
                <p className="mt-3 text-xs text-slate-500">
                  Avance general del lote: se muestra la etapa menos avanzada. Cada equipo puede estar en una etapa diferente.
                </p>
              )}
            </div>
          ))}
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