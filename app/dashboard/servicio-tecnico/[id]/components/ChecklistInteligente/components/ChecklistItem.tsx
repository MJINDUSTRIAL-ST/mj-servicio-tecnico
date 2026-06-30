"use client";

import type { EstadoChecklist, ChecklistItem as ChecklistItemType } from "../../../lib/checklists";
import type { RespuestaChecklist } from "../types";

type Props = {
  item: ChecklistItemType;
  respuesta: RespuestaChecklist;
  onCambiarEstado: (itemId: string, estado: EstadoChecklist) => void;
  onCambiarObservacion: (itemId: string, observacion: string) => void;
  onAgregarFotos: (itemId: string, files: FileList | null) => void;
  onEliminarFoto: (itemId: string, index: number) => void;
};

export default function ChecklistItem({
  item,
  respuesta,
  onCambiarEstado,
  onCambiarObservacion,
  onAgregarFotos,
  onEliminarFoto,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
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
          onClick={() => onCambiarEstado(item.id, "bueno")}
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
          onClick={() => onCambiarEstado(item.id, "malo")}
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
          onClick={() => onCambiarEstado(item.id, "no_aplica")}
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
                onCambiarObservacion(item.id, event.target.value)
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
              onChange={(event) => onAgregarFotos(item.id, event.target.files)}
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
                      onClick={() => onEliminarFoto(item.id, index)}
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
}