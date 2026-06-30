import {
  ChecklistEquipo,
  ChecklistItem,
  EstadoChecklist,
  TipoEquipoChecklist,
} from "../../lib/checklists";

import { DiagnosticoGeneradoMJ } from "../../lib/diagnosticoEngine";

export type RespuestaChecklist = {
  estado: EstadoChecklist | "";
  observacion: string;
  fotos: File[];
};

export type RespuestasChecklist = Record<string, RespuestaChecklist>;

export type ChecklistPayload = {
  equipoId?: string | null;
  tipoEquipo: TipoEquipoChecklist;
  checklist: ChecklistEquipo;
  respuestas: RespuestasChecklist;
  itemsMalos: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>;
  diagnostico: DiagnosticoGeneradoMJ;
};