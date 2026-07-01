"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId: string;
  onEstadoActualizado?: (estado: string) => void;
};

type EquipoRevision = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type RevisionPorEquipo = {
  idRevision: string | null;
  estado: "Aprobado" | "Rechazado" | "";
  motivo: string;
  horas: string;
  procedimiento: string;
  repuestos: string;
  guardando: boolean;
  guardadoOk: boolean;
};

function identificadorEquipo(equipo: EquipoRevision) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function revisionVacia(): RevisionPorEquipo {
  return {
    idRevision: null,
    estado: "",
    motivo: "",
    horas: "",
    procedimiento: "",
    repuestos: "",
    guardando: false,
    guardadoOk: false,
  };
}

function textoAccion(accion: string) {
  if (accion === "repuesto") return "Repuesto";
  if (accion === "reparacion") return "Reparación";
  if (accion === "ajuste") return "Ajuste";
  if (accion === "mantencion") return "Mantención";
  if (accion === "otro") return "Otro";
  return accion;
}

function generarDesdeChecklist(equipoId: string) {
  const trabajo = obtenerEquipoTrabajo(equipoId);
  const checklist = trabajo.checklist;

  if (!checklist?.itemsMalos?.length) {
    return {
      procedimiento: trabajo.diagnostico?.procedimiento || "",
      repuestos: trabajo.diagnostico?.repuestos || "",
    };
  }

  const repuestos: string[] = [];
  const acciones: string[] = [];

  checklist.itemsMalos.forEach((registro: any) => {
    const item = registro.item || {};
    const respuesta = registro.respuesta || {};

    const nombreItem =
      item.nombre ||
      item.titulo ||
      item.label ||
      item.name ||
      item.id ||
      "Ítem observado";

    const accionesItem = respuesta.acciones || [];

    accionesItem.forEach((accion: string) => {
      if (accion === "repuesto") {
        const cantidad = respuesta.repuesto_cantidad || "1";
        const nombre = respuesta.repuesto_nombre || nombreItem;
        repuestos.push(`${cantidad} x ${nombre}`);
      } else if (accion === "otro") {
        acciones.push(`${respuesta.accion_otro || "Otro"} - ${nombreItem}`);
      } else {
        acciones.push(`${textoAccion(accion)} - ${nombreItem}`);
      }
    });
  });

  const procedimientoPartes: string[] = [];

  if (acciones.length > 0) {
    procedimientoPartes.push(`Acciones aprobadas:\n${acciones.join("\n")}`);
  }

  if (repuestos.length > 0) {
    procedimientoPartes.push(`Repuestos aprobados:\n${repuestos.join("\n")}`);
  }

  const procedimiento =
    procedimientoPartes.length > 0
      ? `Se recomienda ejecutar las siguientes acciones antes de liberar el equipo:\n\n${procedimientoPartes.join(
          "\n\n"
        )}`
      : trabajo.diagnostico?.procedimiento || "";

  return {
    procedimiento,
    repuestos: repuestos.join("\n"),
  };
}

export default function RevisionJefe({
  ordenId,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<EquipoRevision[]>([]);
  const [revisiones, setRevisiones] = useState<
    Record<string, RevisionPorEquipo>
  >({});

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    const { data: hijos } = await supabase
      .from("ordenes")
      .select("id,codigo,equipo,marca,modelo,numero_serie")
      .eq("orden_padre_id", ordenId)
      .order("codigo", { ascending: true });

    let equiposBase: EquipoRevision[] = hijos || [];

    if (!equiposBase.length) {
      const { data: orden } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie")
        .eq("id", ordenId)
        .single();

      if (orden) equiposBase = [orden];
    }

    setEquipos(equiposBase);

    const nuevoEstado: Record<string, RevisionPorEquipo> = {};

    for (const equipo of equiposBase) {
      const { data } = await supabase
        .from("revisiones_jefe")
        .select("*")
        .eq("orden_id", equipo.id)
        .maybeSingle();

      const base = generarDesdeChecklist(equipo.id);

      nuevoEstado[equipo.id] = {
        idRevision: data?.id || null,
        estado:
          data?.aprobado === true
            ? "Aprobado"
            : data?.aprobado === false
            ? "Rechazado"
            : "",
        motivo: data?.motivo || "",
        horas: data?.horas_hombre?.toString() || "",
        procedimiento: data?.procedimiento_aprobado || base.procedimiento,
        repuestos: data?.repuestos_aprobados || base.repuestos,
        guardando: false,
        guardadoOk: false,
      };
    }

    setRevisiones(nuevoEstado);
  }

  function actualizarCampo(
    equipoId: string,
    campo: keyof RevisionPorEquipo,
    valor: string
  ) {
    setRevisiones((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || revisionVacia()),
        [campo]: valor,
      },
    }));
  }

  async function guardar(equipoId: string) {
    const actual = revisiones[equipoId] || revisionVacia();

    if (!actual.estado) {
      alert("Debes aprobar o rechazar la revisión.");
      return;
    }

    if (actual.estado === "Rechazado" && !actual.motivo.trim()) {
      alert("Debes indicar el motivo del rechazo.");
      return;
    }

    setRevisiones((prev) => ({
      ...prev,
      [equipoId]: {
        ...actual,
        guardando: true,
        guardadoOk: false,
      },
    }));

    try {
      const datos = {
        orden_id: equipoId,
        aprobado: actual.estado === "Aprobado",
        motivo: actual.motivo,
        horas_hombre: actual.horas ? Number(actual.horas) : null,
        procedimiento_aprobado: actual.procedimiento,
        repuestos_aprobados: actual.repuestos,
        updated_at: new Date().toISOString(),
      };

      guardarEquipoTrabajo(equipoId, {
        revision: {
          aprobado: actual.estado === "Aprobado",
          motivo: actual.motivo,
          horas_hombre: actual.horas ? Number(actual.horas) : null,
          procedimiento_aprobado: actual.procedimiento,
          repuestos_aprobados: actual.repuestos,
        },
      });

      if (actual.idRevision) {
        const { error } = await supabase
          .from("revisiones_jefe")
          .update(datos)
          .eq("id", actual.idRevision);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("revisiones_jefe")
          .insert(datos)
          .select()
          .single();

        if (error) throw error;

        setRevisiones((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || revisionVacia()),
            idRevision: data.id,
          },
        }));
      }

      const nuevoEstadoEquipo =
        actual.estado === "Aprobado" ? "cotizacion" : "diagnostico";

      await supabase
        .from("ordenes")
        .update({ estado: nuevoEstadoEquipo })
        .eq("id", equipoId);

      const todosAprobados = equipos.every((equipo) => {
        if (equipo.id === equipoId) return actual.estado === "Aprobado";

        const revision = revisiones[equipo.id];
        return revision?.estado === "Aprobado" || revision?.idRevision;
      });

      if (todosAprobados) {
        await supabase
          .from("ordenes")
          .update({ estado: "cotizacion" })
          .eq("id", ordenId);

        onEstadoActualizado?.("cotizacion");
      }

      setRevisiones((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || revisionVacia()),
          guardando: false,
          guardadoOk: true,
        },
      }));

      setTimeout(() => {
        setRevisiones((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || revisionVacia()),
            guardadoOk: false,
          },
        }));
      }, 2500);
    } catch (e: any) {
      alert(e.message || "No se pudo guardar la revisión");

      setRevisiones((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || revisionVacia()),
          guardando: false,
        },
      }));
    }
  }

  return (
    <section className="space-y-5">
      {equipos.map((equipo, index) => {
        const actual = revisiones[equipo.id] || revisionVacia();

        return (
          <div
            key={equipo.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Equipo {index + 1}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {equipo.equipo || "Sin tipo"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {identificadorEquipo(equipo)}
                </p>

                {(equipo.marca || equipo.modelo) && (
                  <p className="mt-1 text-xs text-slate-400">
                    {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                  </p>
                )}

                {actual.idRevision && (
                  <p className="mt-2 text-xs font-bold text-green-700">
                    Revisión guardada
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => guardar(equipo.id)}
                disabled={actual.guardando}
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {actual.guardando
                  ? "Guardando..."
                  : actual.guardadoOk
                  ? "✓ Guardado"
                  : actual.idRevision
                  ? "Modificar revisión"
                  : "Guardar revisión"}
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  actual.estado === "Aprobado"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
                onClick={() =>
                  actualizarCampo(equipo.id, "estado", "Aprobado")
                }
              >
                Aprobar
              </button>

              <button
                type="button"
                className={`rounded-xl px-4 py-3 text-sm font-bold ${
                  actual.estado === "Rechazado"
                    ? "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
                onClick={() =>
                  actualizarCampo(equipo.id, "estado", "Rechazado")
                }
              >
                Rechazar
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Motivo / comentario
                </label>

                <textarea
                  value={actual.motivo}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "motivo", event.target.value)
                  }
                  rows={3}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Horas hombre estimadas
                </label>

                <input
                  type="number"
                  value={actual.horas}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "horas", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Procedimiento sugerido
                </label>

                <textarea
                  value={actual.procedimiento}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "procedimiento",
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Repuestos sugeridos
                </label>

                <textarea
                  value={actual.repuestos}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "repuestos", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}