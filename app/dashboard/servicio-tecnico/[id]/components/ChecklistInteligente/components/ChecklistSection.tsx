"use client";

import type { ChecklistSection as ChecklistSectionType } from "../../../lib/checklists";
import type { RespuestasChecklist } from "../types";
import ChecklistItem from "./ChecklistItem";

type Props = {
  section: ChecklistSectionType;
  abierta: boolean;
  onToggle: (sectionId: string) => void;
  respuestas: RespuestasChecklist;
  onCambiarEstado: any;
  onCambiarObservacion: any;
  onAgregarFotos: any;
  onEliminarFoto: any;
};

export default function ChecklistSection({
  section,
  abierta,
  onToggle,
  respuestas,
  onCambiarEstado,
  onCambiarObservacion,
  onAgregarFotos,
  onEliminarFoto,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200">
      <button
        type="button"
        onClick={() => onToggle(section.id)}
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
          {section.items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              respuesta={
                respuestas[item.id] ?? {
                  estado: "",
                  observacion: "",
                  fotos: [],
                }
              }
              onCambiarEstado={onCambiarEstado}
              onCambiarObservacion={onCambiarObservacion}
              onAgregarFotos={onAgregarFotos}
              onEliminarFoto={onEliminarFoto}
            />
          ))}
        </div>
      )}
    </div>
  );
}