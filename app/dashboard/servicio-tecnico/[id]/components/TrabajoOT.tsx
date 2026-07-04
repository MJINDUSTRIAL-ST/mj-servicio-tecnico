"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId?: string;
  equipos?: any[];
  onEstadoActualizado?: (estado: string) => void;
};

type Equipo = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type TrabajoEquipo = {
  trabajo_realizado: string;
  repuestos_utilizados: string;
  observaciones: string;
  prueba_funcional: boolean;
  prueba_carga: boolean;
  equipo_liberado: boolean;
  guardando: boolean;
  guardadoOk: boolean;
};

function trabajoVacio(): TrabajoEquipo {
  return {
    trabajo_realizado: "",
    repuestos_utilizados: "",
    observaciones: "",
    prueba_funcional: false,
    prueba_carga: false,
    equipo_liberado: false,
    guardando: false,
    guardadoOk: false,
  };
}

function identificadorEquipo(equipo: Equipo) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function generarTrabajoBase(equipoId: string) {
  const data = obtenerEquipoTrabajo(equipoId);

  return {
    trabajo_realizado:
      data.revision?.procedimiento_aprobado ||
      data.diagnostico?.procedimiento ||
      "",
    repuestos_utilizados:
      data.revision?.repuestos_aprobados ||
      data.diagnostico?.repuestos ||
      "",
  };
}

export default function TrabajoOT({
  ordenId,
  equipos: equiposIniciales,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [trabajos, setTrabajos] = useState<Record<string, TrabajoEquipo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    if (!ordenId) return;

    setLoading(true);

    try {
      const { data: hijos } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie")
        .eq("orden_padre_id", ordenId)
        .order("codigo", { ascending: true });

      let equiposBase: Equipo[] = hijos || [];

      if (!equiposBase.length) {
        const { data: orden } = await supabase
          .from("ordenes")
          .select("id,codigo,equipo,marca,modelo,numero_serie")
          .eq("id", ordenId)
          .single();

        if (orden) equiposBase = [orden];
      }

      const estadoInicial: Record<string, TrabajoEquipo> = {};

      equiposBase.forEach((equipo) => {
        const data = obtenerEquipoTrabajo(equipo.id);
        const base = generarTrabajoBase(equipo.id);
        const trabajoGuardado = data.trabajo as Partial<TrabajoEquipo> | undefined;

        estadoInicial[equipo.id] = {
          ...trabajoVacio(),
          trabajo_realizado:
            trabajoGuardado?.trabajo_realizado || base.trabajo_realizado,
          repuestos_utilizados:
            trabajoGuardado?.repuestos_utilizados || base.repuestos_utilizados,
          observaciones: trabajoGuardado?.observaciones || "",
          prueba_funcional: Boolean(trabajoGuardado?.prueba_funcional),
          prueba_carga: Boolean(trabajoGuardado?.prueba_carga),
          equipo_liberado: Boolean(trabajoGuardado?.equipo_liberado),
        };
      });

      setEquipos(equiposBase);
      setTrabajos(estadoInicial);
    } catch (e: any) {
      alert(e.message || "No se pudo cargar el trabajo");
    } finally {
      setLoading(false);
    }
  }

  function actualizarCampo(
    equipoId: string,
    campo: keyof TrabajoEquipo,
    valor: string | boolean
  ) {
    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || trabajoVacio()),
        [campo]: valor,
      },
    }));
  }

  async function guardar(equipoId: string) {
    const actual = trabajos[equipoId] || trabajoVacio();

    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...actual,
        guardando: true,
        guardadoOk: false,
      },
    }));

    try {
      guardarEquipoTrabajo(equipoId, {
        trabajo: {
          trabajo_realizado: actual.trabajo_realizado,
          repuestos_utilizados: actual.repuestos_utilizados,
          observaciones: actual.observaciones,
          prueba_funcional: actual.prueba_funcional,
          prueba_carga: actual.prueba_carga,
          equipo_liberado: actual.equipo_liberado,
        },
      } as any);

      if (actual.equipo_liberado) {
  await supabase
    .from("ordenes")
    .update({ estado: "listo" })
    .eq("id", equipoId)

  if (ordenId) {
    await supabase
      .from("ordenes")
      .update({ estado: "listo" })
      .eq("id", ordenId)

    onEstadoActualizado?.("listo")
  }

} else {
  await supabase
    .from("ordenes")
    .update({ estado: "trabajo" })
    .eq("id", equipoId)
}

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          guardando: false,
          guardadoOk: true,
        },
      }));

      setTimeout(() => {
        setTrabajos((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || trabajoVacio()),
            guardadoOk: false,
          },
        }));
      }, 2200);
    } catch (e: any) {
      alert(e.message || "No se pudo guardar el trabajo");

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          guardando: false,
        },
      }));
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        Cargando trabajo...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {equipos.map((equipo, index) => {
        const actual = trabajos[equipo.id] || trabajoVacio();

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

                {actual.equipo_liberado && (
                  <p className="mt-2 text-xs font-bold text-green-700">
                    Equipo marcado como listo
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
                  : "Guardar trabajo"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Trabajo realizado
                </label>

                <textarea
                  value={actual.trabajo_realizado}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "trabajo_realizado",
                      event.target.value
                    )
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Repuestos utilizados
                </label>

                <textarea
                  value={actual.repuestos_utilizados}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "repuestos_utilizados",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observaciones finales del técnico
                </label>

                <textarea
                  value={actual.observaciones}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "observaciones", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={actual.prueba_funcional}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "prueba_funcional",
                        event.target.checked
                      )
                    }
                  />
                  Prueba funcional realizada
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={actual.prueba_carga}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "prueba_carga",
                        event.target.checked
                      )
                    }
                  />
                  Prueba de carga realizada
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-green-50 p-4 text-sm font-bold text-green-700">
                  <input
                    type="checkbox"
                    checked={actual.equipo_liberado}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "equipo_liberado",
                        event.target.checked
                      )
                    }
                  />
                  Equipo listo para entrega
                </label>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}