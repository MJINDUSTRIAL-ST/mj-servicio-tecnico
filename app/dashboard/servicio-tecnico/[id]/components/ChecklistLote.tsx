"use client";

import { useState } from "react";
import ChecklistInteligente from "./ChecklistInteligente";

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
};

export default function ChecklistLote({ equipos }: Props) {
  const [equipoAbierto, setEquipoAbierto] = useState<string | null>(
    equipos[0]?.id ?? null
  );

  const [equiposCompletados, setEquiposCompletados] = useState<
    Record<string, boolean>
  >({});

  function completarEquipo(equipoId: string) {
    setEquiposCompletados((prev) => ({
      ...prev,
      [equipoId]: true,
    }));

    const indexActual = equipos.findIndex((equipo) => equipo.id === equipoId);
    const siguiente = equipos[indexActual + 1];

    if (siguiente) {
      setEquipoAbierto(siguiente.id);
    } else {
      setEquipoAbierto(null);
    }
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
                  {equipo.codigo ? ` · ${equipo.codigo}` : ""}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {equipo.equipo || "Sin tipo"}
                  {equipo.marca ? ` · ${equipo.marca}` : ""}
                  {equipo.modelo ? ` · ${equipo.modelo}` : ""}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {equipo.numero_serie
                    ? `Serie: ${equipo.numero_serie}`
                    : equipo.codigo
                    ? `Código equipo: ${equipo.codigo}`
                    : `ID equipo: ${equipo.id.slice(0, 8)}`}
                </p>
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
                  onGenerarDiagnostico={() => completarEquipo(equipo.id)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}