import {
  CHECKLISTS,
  ChecklistEquipo,
  TipoEquipoChecklist,
} from "../../lib/checklists";

import { RespuestasChecklist } from "./types";

export function normalizarTipoEquipo(
  tipo: string | null | undefined
): TipoEquipoChecklist | "" {
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

export function crearRespuestasVacias(
  checklist: ChecklistEquipo | null
): RespuestasChecklist {
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

export function getChecklistInicial(tipoEquipo: TipoEquipoChecklist | "") {
  return tipoEquipo ? CHECKLISTS[tipoEquipo] : null;
}