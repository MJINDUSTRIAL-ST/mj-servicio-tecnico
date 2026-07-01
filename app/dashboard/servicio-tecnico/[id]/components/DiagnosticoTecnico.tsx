"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Props = {
  ordenId: string;
  onEstadoActualizado?: (estado: string) => void;
};

type EquipoDiagnostico = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type DiagnosticoPorEquipo = {
  idDiagnostico: string | null;
  hallazgos: string;
  procedimiento: string;
  repuestos: string;
  guardando: boolean;
  guardadoOk: boolean;
};

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

    const repuestos = Object.values(respuestas)
      .filter((respuesta) => respuesta.acciones?.includes("repuesto"))
      .map((respuesta) => {
        const nombre = respuesta.repuesto_nombre || "Repuesto sin especificar";
        const cantidad = respuesta.repuesto_cantidad || "1";
        return `${cantidad} x ${nombre}`;
      });

    return repuestos.join("\n");
  } catch {
    return "";
  }
}

export default function DiagnosticoTecnico({
  ordenId,
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
      .select("id,codigo,equipo,marca,modelo,numero_serie")
      .eq("orden_padre_id", ordenId)
      .order("created_at", { ascending: true });

    let equiposBase: EquipoDiagnostico[] = hijos || [];

    if (!equiposBase.length) {
      const { data: orden } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie")
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

      nuevoEstado[equipo.id] = {
        idDiagnostico: data?.id || null,
        hallazgos: data?.hallazgos || "",
        procedimiento: data?.procedimiento || "",
        repuestos: data?.repuestos || repuestosDesdeChecklist(equipo.id),
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
    setDiagnosticos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || diagnosticoVacio()),
        [campo]: valor,
      },
    }));
  }

  async function guardar(equipoId: string) {
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

      await supabase.from("ordenes").update({ estado: "revision" }).eq("id", ordenId);

      onEstadoActualizado?.("revision");

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
                  : actual.idDiagnostico
                  ? "Modificar diagnóstico"
                  : "Guardar diagnóstico"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Hallazgos del diagnóstico
                </label>

                <textarea
                  value={actual.hallazgos}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "hallazgos", event.target.value)
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Procedimiento recomendado
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
                  rows={4}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Repuestos solicitados
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