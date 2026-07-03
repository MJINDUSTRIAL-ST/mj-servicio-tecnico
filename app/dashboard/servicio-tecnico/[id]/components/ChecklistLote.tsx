"use client";

import { supabase } from "../../../../lib/supabase";
import { useEffect, useState } from "react";
import ChecklistInteligente from "./ChecklistInteligente";
import {
  guardarEquipoTrabajo,
  generarDiagnosticoBaseDesdeChecklist,
} from "../lib/equipoTrabajoStore";

type Equipo = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type Props = {
  equipos: Equipo[];
  ordenId: string;
};

function identificadorEquipo(equipo: Equipo) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

export default function ChecklistLote({ equipos, ordenId }: Props) {
  const [equipoAbierto, setEquipoAbierto] = useState<string | null>(
    equipos[0]?.id ?? null
  );

  const [equiposCompletados, setEquiposCompletados] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const completados: Record<string, boolean> = {};

    equipos.forEach((equipo) => {
      completados[equipo.id] =
        localStorage.getItem(`equipo-completado-${equipo.id}`) === "true";
    });

    setEquiposCompletados(completados);

    const primerPendiente = equipos.find((equipo) => !completados[equipo.id]);
    setEquipoAbierto(primerPendiente ? primerPendiente.id : null);
  }, [equipos]);

  async function completarEquipo(equipoId: string, payload?: any) {
    localStorage.setItem(`equipo-completado-${equipoId}`, "true");

    if (payload?.diagnostico) {
      const repuestos = Object.values(payload.respuestas || {})
        .filter((respuesta: any) =>
          respuesta.acciones?.includes("repuesto")
        )
        .map((respuesta: any) => {
          const cantidad = respuesta.repuesto_cantidad || "1";
          const nombre =
            respuesta.repuesto_nombre || "Repuesto sin especificar";
          return `${cantidad} x ${nombre}`;
        })
        .join("\n");
        const diagnosticoBase = generarDiagnosticoBaseDesdeChecklist(payload);

guardarEquipoTrabajo(equipoId, {
  checklist: payload,
  diagnostico: diagnosticoBase,
});

await supabase
  .from("ordenes")
  .update({ estado: "diagnostico" })
  .eq("id", ordenId);

      localStorage.setItem(
        `diagnostico-${equipoId}`,
        JSON.stringify({
          hallazgos:
  payload.diagnostico.resumen ||
  `Durante la inspección del equipo se detectaron ${payload.itemsMalos?.length || 0} componente(s) en mal estado.`,

procedimiento:
  repuestos
    ? `Se recomienda revisar los componentes observados, realizar el reemplazo o reparación correspondiente y efectuar prueba funcional antes de liberar el equipo.\n\nRepuestos solicitados:\n${repuestos}`
    : "Se recomienda revisar los componentes observados, realizar las reparaciones correspondientes y efectuar prueba funcional antes de liberar el equipo.",

repuestos,
        })
      );
    }

    setEquiposCompletados((prev) => ({
      ...prev,
      [equipoId]: true,
    }));

    const indexActual = equipos.findIndex((equipo) => equipo.id === equipoId);
    const siguiente = equipos[indexActual + 1];

    setEquipoAbierto(siguiente ? siguiente.id : null);
  }

  if (!equipos.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
        Esta OT no tiene equipos asociados.
      </div>
    );
  }

  const completados = equipos.filter(
    (equipo) => equiposCompletados[equipo.id]
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Checklist del lote
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Completa el checklist de cada equipo. Al generar el diagnóstico, se
          abrirá automáticamente el siguiente equipo.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-500">
              Total equipos
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {equipos.length}
            </p>
          </div>

          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-700">
              Completados
            </p>
            <p className="mt-1 text-2xl font-bold text-green-800">
              {completados}
            </p>
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <p className="text-sm font-semibold text-yellow-700">
              Pendientes
            </p>
            <p className="mt-1 text-2xl font-bold text-yellow-800">
              {equipos.length - completados}
            </p>
          </div>
        </div>
      </div>

      {equipos.map((equipo, index) => {
        const abierto = equipoAbierto === equipo.id;
        const completado = Boolean(equiposCompletados[equipo.id]);

        return (
          <div
            key={equipo.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => setEquipoAbierto(abierto ? null : equipo.id)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left hover:bg-slate-50"
            >
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Equipo {index + 1}
                </h3>

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
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    completado
                      ? "bg-green-100 text-green-800"
                      : abierto
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {completado
                    ? "Diagnóstico guardado"
                    : abierto
                    ? "En revisión"
                    : "Pendiente"}
                </span>

                <span className="text-2xl font-bold text-slate-400">
                  {abierto ? "−" : "+"}
                </span>
              </div>
            </button>

            {abierto && (
              <div className="border-t border-slate-200 p-6">
                <ChecklistInteligente
                  equipoId={equipo.id}
                  tipoEquipoInicial={equipo.equipo}
                  onGenerarDiagnostico={(payload) =>
                    completarEquipo(equipo.id, payload)
                  }
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}