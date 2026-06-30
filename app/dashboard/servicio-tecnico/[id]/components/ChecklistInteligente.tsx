"use client";

import { useMemo, useState } from "react";
import {
  CHECKLISTS,
  ChecklistEquipo,
  ChecklistItem,
  EstadoChecklist,
  TipoEquipoChecklist,
  getChecklistByTipo,
} from "../lib/checklists";

type RespuestaChecklist = {
  estado: EstadoChecklist | "";
  observacion: string;
  fotos: File[];
};

type RespuestasChecklist = Record<string, RespuestaChecklist>;

type ChecklistInteligenteProps = {
  tipoEquipoInicial?: string | null;
  equipoId?: string | null;
  onGenerarDiagnostico?: (payload: {
    equipoId?: string | null;
    tipoEquipo: TipoEquipoChecklist;
    checklist: ChecklistEquipo;
    respuestas: RespuestasChecklist;
    itemsMalos: Array<{
      item: ChecklistItem;
      respuesta: RespuestaChecklist;
    }>;
  }) => void;
};

function normalizarTipoEquipo(tipo: string | null | undefined): TipoEquipoChecklist | "" {
  if (!tipo) return "";

  const value = tipo.toLowerCase().trim();

  const equivalencias: Record<string, TipoEquipoChecklist> = {
    "tecle electrico": "tecle_electrico",
    "tecle eléctrico": "tecle_electrico",
    "tecle_electrico": "tecle_electrico",
    "tecle manual": "tecle_manual",
    "tecle_manual": "tecle_manual",
    "tecle de palanca": "tecle_palanca",
    "tecle palanca": "tecle_palanca",
    "tecle_palanca": "tecle_palanca",
    winche: "winche",
    tirfor: "tirfor",
    minifor: "minifor",
    "transpaleta electrica": "transpaleta_electrica",
    "transpaleta eléctrica": "transpaleta_electrica",
    transpaleta: "transpaleta_electrica",
    "transpaleta_electrica": "transpaleta_electrica",
  };

  return equivalencias[value] ?? "";
}

function crearRespuestasVacias(checklist: ChecklistEquipo | null): RespuestasChecklist {
  if (!checklist) return {};

  const respuestas: RespuestasChecklist = {};

  checklist.sections.forEach((section) => {
    section.items.forEach((item) => {
      respuestas[item.id] = {
        estado: "",
        observacion: "",
        fotos: [],
      };
    });
  });

  return respuestas;
}

export default function ChecklistInteligente({
  tipoEquipoInicial,
  equipoId,
  onGenerarDiagnostico,
}: ChecklistInteligenteProps) {
  const tipoEquipo = normalizarTipoEquipo(tipoEquipoInicial);

  const checklist = useMemo(() => {
    return tipoEquipo ? getChecklistByTipo(tipoEquipo) : null;
  }, [tipoEquipo]);

  const [respuestas, setRespuestas] = useState<RespuestasChecklist>(() =>
    crearRespuestasVacias(tipoEquipo ? CHECKLISTS[tipoEquipo] : null)
  );

  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Record<string, boolean>>({});
  const [diagnosticoGenerado, setDiagnosticoGenerado] = useState(false);

  const totalItems =
    checklist?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0;

  const itemsRespondidos = Object.values(respuestas).filter(
    (respuesta) => respuesta.estado
  ).length;

  const itemsMalos = useMemo(() => {
    if (!checklist) return [];

    return checklist.sections.flatMap((section) =>
      section.items
        .map((item) => ({
          item,
          respuesta: respuestas[item.id],
        }))
        .filter((registro) => registro.respuesta?.estado === "malo")
    );
  }, [checklist, respuestas]);

  const porcentajeAvance =
    totalItems > 0 ? Math.round((itemsRespondidos / totalItems) * 100) : 0;

  function cambiarEstado(itemId: string, estado: EstadoChecklist) {
    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        estado,
        observacion: estado === "malo" ? prev[itemId]?.observacion ?? "" : "",
        fotos: estado === "malo" ? prev[itemId]?.fotos ?? [] : [],
      },
    }));
  }

  function cambiarObservacion(itemId: string, observacion: string) {
    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        observacion,
      },
    }));
  }

  function agregarFotos(itemId: string, files: FileList | null) {
    if (!files) return;

    const nuevasFotos = Array.from(files);

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        fotos: [...(prev[itemId]?.fotos ?? []), ...nuevasFotos],
      },
    }));
  }

  function eliminarFoto(itemId: string, index: number) {
    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        fotos: (prev[itemId]?.fotos ?? []).filter(
          (_, fotoIndex) => fotoIndex !== index
        ),
      },
    }));
  }

  function toggleSeccion(sectionId: string) {
    setSeccionesAbiertas((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }

  function generarDiagnostico() {
    if (!checklist || !tipoEquipo) return;

    setDiagnosticoGenerado(true);

    onGenerarDiagnostico?.({
      equipoId,
      tipoEquipo,
      checklist,
      respuestas,
      itemsMalos,
    });
  }

  if (!tipoEquipo || !checklist) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-xl font-bold text-amber-900">Checklist no disponible</h2>
        <p className="mt-2 text-sm text-amber-800">
          Esta orden no tiene un tipo de equipo compatible con el checklist inteligente.
          Revisa el campo Tipo de equipo en Detalle.
        </p>
        <p className="mt-3 text-sm font-semibold text-amber-900">
          Tipo actual: {tipoEquipoInicial || "Sin tipo definido"}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Checklist Inteligente</h2>
          <p className="mt-1 text-sm text-slate-500">
            Checklist cargado automáticamente según el tipo de equipo ingresado.
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          Avance {porcentajeAvance}%
        </div>
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-500">Tipo de equipo</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{checklist.nombre}</p>
        <p className="mt-1 text-sm text-slate-500">{checklist.descripcion}</p>

        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs font-semibold">
          <div className="rounded-lg bg-white p-3 text-slate-600">
            Total
            <div className="mt-1 text-lg text-slate-900">{totalItems}</div>
          </div>

          <div className="rounded-lg bg-white p-3 text-slate-600">
            Respondidos
            <div className="mt-1 text-lg text-slate-900">{itemsRespondidos}</div>
          </div>

          <div className="rounded-lg bg-white p-3 text-slate-600">
            Malos
            <div className="mt-1 text-lg text-red-600">{itemsMalos.length}</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {checklist.sections.map((section, sectionIndex) => {
          const abierta = seccionesAbiertas[section.id] ?? sectionIndex === 0;

          return (
            <div key={section.id} className="rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => toggleSeccion(section.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="font-bold text-slate-900">{section.titulo}</p>
                  {section.descripcion && (
                    <p className="mt-1 text-sm text-slate-500">{section.descripcion}</p>
                  )}
                </div>

                <span className="text-sm font-bold text-blue-600">
                  {abierta ? "Cerrar" : "Abrir"}
                </span>
              </button>

              {abierta && (
                <div className="space-y-3 border-t border-slate-200 p-4">
                  {section.items.map((item) => {
                    const respuesta = respuestas[item.id] ?? {
                      estado: "",
                      observacion: "",
                      fotos: [],
                    };

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">{item.label}</p>

                            {item.afectaSeguridad && (
                              <p className="mt-1 text-xs font-semibold text-red-600">
                                Componente crítico de seguridad
                              </p>
                            )}
                          </div>

                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {item.sistema}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => cambiarEstado(item.id, "bueno")}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                              respuesta.estado === "bueno"
                                ? "border-green-500 bg-green-50 text-green-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Bueno
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(item.id, "malo")}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                              respuesta.estado === "malo"
                                ? "border-red-500 bg-red-50 text-red-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Malo
                          </button>

                          <button
                            type="button"
                            onClick={() => cambiarEstado(item.id, "no_aplica")}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                              respuesta.estado === "no_aplica"
                                ? "border-slate-500 bg-slate-100 text-slate-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            No aplica
                          </button>
                        </div>

                        {respuesta.estado === "malo" && (
                          <div className="mt-4 space-y-3 rounded-xl bg-red-50 p-4">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Observación
                              </label>

                              <textarea
                                value={respuesta.observacion}
                                onChange={(event) =>
                                  cambiarObservacion(item.id, event.target.value)
                                }
                                placeholder="Describe brevemente la falla encontrada..."
                                className="min-h-[90px] w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Fotos
                              </label>

                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) => agregarFotos(item.id, event.target.files)}
                                className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
                              />

                              {respuesta.fotos.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {respuesta.fotos.map((foto, index) => (
                                    <div
                                      key={`${foto.name}-${index}`}
                                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                      <span className="truncate text-slate-700">
                                        {foto.name}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => eliminarFoto(item.id, index)}
                                        className="ml-3 text-xs font-bold text-red-600"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold text-slate-900">Generar diagnóstico</p>
          <p className="mt-1 text-sm text-slate-500">
            La IA utilizará las respuestas del checklist para generar el diagnóstico técnico.
          </p>
        </div>

        <button
          type="button"
          onClick={generarDiagnostico}
          disabled={itemsRespondidos === 0}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Generar Diagnóstico
        </button>
      </div>

      {diagnosticoGenerado && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          Checklist preparado para generar diagnóstico. En la siguiente etapa conectaremos este botón con IA y Supabase.
        </div>
      )}
    </div>
  );
}