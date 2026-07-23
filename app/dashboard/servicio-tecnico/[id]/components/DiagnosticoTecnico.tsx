"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId: string;
  soloLectura?: boolean;
  edicionHistorica?: boolean;
  onEstadoActualizado?: (estado: string) => void;
};

type EquipoDiagnostico = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  tecnico_a_cargo?: string | null;
};

type DiagnosticoPorEquipo = {
  idDiagnostico: string | null;
  hallazgos: string;
  procedimiento: string;
  repuestos: string;
  tecnicoACargo: string;
  guardando: boolean;
  guardadoOk: boolean;
};

const TECNICOS_MJ = [
  "Gustavo Santana",
  "Alvaro Quezada",
  "Jonathan Fonseca",
  "Sergio Gonzalez",
  "Claudia Salazar",
  "Andres Berdejo",
];

function identificadorEquipo(equipo: EquipoDiagnostico) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function diagnosticoVacio(): DiagnosticoPorEquipo {
  return {
    idDiagnostico: null,
    hallazgos: "",
    procedimiento: "",
    repuestos: "",
    tecnicoACargo: "",
    guardando: false,
    guardadoOk: false,
  };
}

function repuestosDesdeChecklist(equipoId: string) {
  try {
    const raw = localStorage.getItem(`checklist-${equipoId}`);
    if (!raw) return "";

    const respuestas = JSON.parse(raw) as Record<
      string,
      {
        acciones?: string[];
        repuesto_nombre?: string;
        repuesto_cantidad?: string;
      }
    >;

    return Object.values(respuestas)
      .filter((respuesta) => respuesta.acciones?.includes("repuesto"))
      .map((respuesta) => {
        const nombre = respuesta.repuesto_nombre || "Repuesto sin especificar";
        const cantidad = respuesta.repuesto_cantidad || "1";
        return `${cantidad} x ${nombre}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}

function generarHallazgosBase(repuestos: string) {
  if (!repuestos.trim()) return "";

  return `Durante la inspección del equipo se detectaron componentes en mal estado que requieren intervención técnica. Los elementos observados fueron:

${repuestos}

Se recomienda no liberar el equipo para operación hasta realizar la revisión técnica correspondiente.`;
}

function generarProcedimientoBase(repuestos: string) {
  if (!repuestos.trim()) return "";

  return `Se recomienda revisar los componentes observados, realizar el reemplazo o reparación correspondiente y efectuar prueba funcional antes de liberar el equipo.

Repuestos solicitados:
${repuestos}`;
}

export default function DiagnosticoTecnico({
  ordenId,
  soloLectura = false,
  edicionHistorica = false,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<EquipoDiagnostico[]>([]);
  const [diagnosticos, setDiagnosticos] = useState<
    Record<string, DiagnosticoPorEquipo>
  >({});

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    const { data: hijos } = await supabase
      .from("ordenes")
      .select("id,codigo,equipo,marca,modelo,numero_serie,tecnico_a_cargo")
      .eq("orden_padre_id", ordenId)
      .order("codigo", { ascending: true });

    let equiposBase: EquipoDiagnostico[] = hijos || [];

    if (!equiposBase.length) {
      const { data: orden } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie,tecnico_a_cargo")
        .eq("id", ordenId)
        .single();

      if (orden) equiposBase = [orden];
    }

    setEquipos(equiposBase);

    const nuevoEstado: Record<string, DiagnosticoPorEquipo> = {};

    for (const equipo of equiposBase) {
      const { data } = await supabase
        .from("diagnosticos")
        .select("*")
        .eq("orden_id", equipo.id)
        .maybeSingle();

      const trabajo = obtenerEquipoTrabajo(equipo.id);
      const diagnosticoTrabajo = trabajo.diagnostico;

      const repuestosDetectados =
        data?.repuestos ||
        diagnosticoTrabajo?.repuestos ||
        repuestosDesdeChecklist(equipo.id);

      const hallazgosBase = generarHallazgosBase(repuestosDetectados);
      const procedimientoBase = generarProcedimientoBase(repuestosDetectados);

      nuevoEstado[equipo.id] = {
        idDiagnostico: data?.id || null,
        hallazgos:
          data?.hallazgos ||
          diagnosticoTrabajo?.hallazgos ||
          hallazgosBase,
        procedimiento:
          data?.procedimiento ||
          diagnosticoTrabajo?.procedimiento ||
          procedimientoBase,
        repuestos: repuestosDetectados,
        tecnicoACargo: equipo.tecnico_a_cargo || "",
        guardando: false,
        guardadoOk: false,
      };
    }

    setDiagnosticos(nuevoEstado);
  }

  function actualizarCampo(
    equipoId: string,
    campo: "hallazgos" | "procedimiento" | "repuestos",
    valor: string
  ) {
    if (soloLectura) return;

    setDiagnosticos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || diagnosticoVacio()),
        [campo]: valor,
      },
    }));
  }

  async function actualizarTecnicoACargo(equipoId: string, valor: string) {
    if (soloLectura) return;

    setDiagnosticos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || diagnosticoVacio()),
        tecnicoACargo: valor,
      },
    }));

    const { error } = await supabase
      .from("ordenes")
      .update({ tecnico_a_cargo: valor || null })
      .eq("id", equipoId);

    if (error) {
      console.error("No se pudo guardar el técnico a cargo:", error);
    }
  }

  async function guardar(equipoId: string) {
    if (soloLectura) return;

    const actual = diagnosticos[equipoId] || diagnosticoVacio();

    setDiagnosticos((prev) => ({
      ...prev,
      [equipoId]: {
        ...actual,
        guardando: true,
        guardadoOk: false,
      },
    }));

    try {
      guardarEquipoTrabajo(equipoId, {
        diagnostico: {
          hallazgos: actual.hallazgos,
          procedimiento: actual.procedimiento,
          repuestos: actual.repuestos,
        },
      });

      if (actual.idDiagnostico) {
        const { error } = await supabase
          .from("diagnosticos")
          .update({
            hallazgos: actual.hallazgos,
            procedimiento: actual.procedimiento,
            repuestos: actual.repuestos,
            updated_at: new Date().toISOString(),
          })
          .eq("id", actual.idDiagnostico);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("diagnosticos")
          .insert({
            orden_id: equipoId,
            hallazgos: actual.hallazgos,
            procedimiento: actual.procedimiento,
            repuestos: actual.repuestos,
          })
          .select()
          .single();

        if (error) throw error;

        setDiagnosticos((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || diagnosticoVacio()),
            idDiagnostico: data.id,
          },
        }));
      }

      if (!edicionHistorica) {
        await supabase
          .from("ordenes")
          .update({
            estado: "revision",
            tecnico_a_cargo: actual.tecnicoACargo || null,
          })
          .eq("id", equipoId);

        const todosConDiagnostico = equipos.every((equipo) => {
          if (equipo.id === equipoId) return true;
          const diagnostico = diagnosticos[equipo.id];
          return Boolean(diagnostico?.idDiagnostico);
        });

        if (todosConDiagnostico) {
          await supabase
            .from("ordenes")
            .update({ estado: "revision" })
            .eq("id", ordenId);

          onEstadoActualizado?.("revision");
        }
      }

      setDiagnosticos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || diagnosticoVacio()),
          guardando: false,
          guardadoOk: true,
        },
      }));

      setTimeout(() => {
        setDiagnosticos((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || diagnosticoVacio()),
            guardadoOk: false,
          },
        }));
      }, 2500);
    } catch (e: any) {
      alert(e.message || "No se pudo guardar el diagnóstico");

      setDiagnosticos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || diagnosticoVacio()),
          guardando: false,
        },
      }));
    }
  }

  return (
    <section className="space-y-5">
      {soloLectura && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Diagnóstico guardado. Presiona Modificar etapa para habilitar cambios.
        </div>
      )}

      {equipos.map((equipo, index) => {
        const actual = diagnosticos[equipo.id] || diagnosticoVacio();

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

                {actual.idDiagnostico && (
                  <p className="mt-2 text-xs font-bold text-green-700">
                    Diagnóstico guardado
                  </p>
                )}
              </div>

              {!soloLectura && (
                <button
                  type="button"
                  onClick={() => guardar(equipo.id)}
                  disabled={actual.guardando}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {actual.guardando
                    ? "Guardando..."
                    : actual.guardadoOk
                      ? "Guardado"
                      : edicionHistorica
                        ? "Guardar cambios"
                        : actual.idDiagnostico
                          ? "Guardar y avanzar a Revisión"
                          : "Guardar diagnóstico"}
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Técnico a cargo
                </label>

                <select
                  value={actual.tecnicoACargo}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarTecnicoACargo(equipo.id, event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Seleccionar técnico</option>
                  {TECNICOS_MJ.map((tecnico) => (
                    <option key={tecnico} value={tecnico}>
                      {tecnico}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Este técnico quedará asociado al diagnóstico y al informe técnico.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Hallazgos del diagnóstico
                </label>

                <textarea
                  value={actual.hallazgos}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "hallazgos", event.target.value)
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Procedimiento recomendado
                </label>

                <textarea
                  value={actual.procedimiento}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "procedimiento",
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Repuestos solicitados
                </label>

                <textarea
                  value={actual.repuestos}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "repuestos", event.target.value)
                  }
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}