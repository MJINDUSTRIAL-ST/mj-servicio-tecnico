import type {
  ChecklistEquipo,
  ChecklistItem,
  EstadoChecklist,
  TipoEquipoChecklist,
} from "./checklists";

export type RespuestaChecklistDiagnostico = {
  estado: EstadoChecklist | "";
  observacion: string;
  fotos?: File[];
};

export type RespuestasChecklistDiagnostico = Record<
  string,
  RespuestaChecklistDiagnostico
>;

export type DiagnosticoGeneradoMJ = {
  tipoEquipo: TipoEquipoChecklist;
  nombreEquipo: string;
  resumen: string;
  diagnosticoTecnico: string;
  procedimientoRecomendado: string[];
  repuestosSugeridos: string[];
  criticidad: "baja" | "media" | "alta" | "critica";
  requiereRetiroServicio: boolean;
  itemsMalos: {
    id: string;
    label: string;
    sistema: string;
    criticidad: string;
    afectaSeguridad: boolean;
    observacion: string;
    repuestosSugeridos: string[];
    procedimientosSugeridos: string[];
  }[];
};

function limpiarDuplicados(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function prioridadCriticidad(valor: string) {
  if (valor === "critica") return 4;
  if (valor === "alta") return 3;
  if (valor === "media") return 2;
  return 1;
}

function obtenerCriticidadGeneral(itemsMalos: ChecklistItem[]) {
  const mayor = itemsMalos.reduce((max, item) => {
    return Math.max(max, prioridadCriticidad(item.criticidad));
  }, 1);

  if (mayor >= 4) return "critica";
  if (mayor === 3) return "alta";
  if (mayor === 2) return "media";
  return "baja";
}

function textoCriticidad(criticidad: DiagnosticoGeneradoMJ["criticidad"]) {
  if (criticidad === "critica") return "crítica";
  if (criticidad === "alta") return "alta";
  if (criticidad === "media") return "media";
  return "baja";
}

export function generarDiagnosticoMJ(params: {
  tipoEquipo: TipoEquipoChecklist;
  checklist: ChecklistEquipo;
  respuestas: RespuestasChecklistDiagnostico;
}): DiagnosticoGeneradoMJ {
  const { tipoEquipo, checklist, respuestas } = params;

  const todosLosItems = checklist.sections.flatMap((section) => section.items);

  const itemsMalos = todosLosItems
    .filter((item) => respuestas[item.id]?.estado === "malo")
    .map((item) => ({
      item,
      respuesta: respuestas[item.id],
    }));

  const itemsBuenos = todosLosItems.filter(
    (item) => respuestas[item.id]?.estado === "bueno"
  );

  const itemsCriticosMalos = itemsMalos.filter(
    ({ item }) => item.afectaSeguridad || item.criticidad === "critica"
  );

  const criticidad = obtenerCriticidadGeneral(itemsMalos.map(({ item }) => item));
  const requiereRetiroServicio = itemsCriticosMalos.length > 0;

  const repuestosSugeridos = limpiarDuplicados(
    itemsMalos.flatMap(({ item }) => item.repuestosSugeridos || [])
  );

  const procedimientoRecomendado = limpiarDuplicados([
    ...itemsMalos.flatMap(({ item }) => item.procedimientosSugeridos || []),
    "Realizar limpieza técnica del equipo.",
    "Realizar prueba operacional en vacío.",
    ...(requiereRetiroServicio
      ? ["Mantener equipo fuera de servicio hasta corregir las fallas críticas."]
      : []),
    "Realizar prueba final de funcionamiento.",
  ]);

  const detalleFallas = itemsMalos.map(({ item, respuesta }) => {
    const observacion = respuesta?.observacion?.trim();

    if (observacion) {
      return `- ${item.label}: ${observacion}`;
    }

    return `- ${item.label}: componente marcado como malo durante la inspección.`;
  });

  const resumen =
    itemsMalos.length === 0
      ? `No se detectaron componentes en mal estado durante el checklist del ${checklist.nombre}.`
      : `Se detectaron ${itemsMalos.length} componente(s) en mal estado durante la inspección del ${checklist.nombre}. La criticidad general del diagnóstico es ${textoCriticidad(
          criticidad
        )}.`;

  const diagnosticoTecnico =
    itemsMalos.length === 0
      ? [
          `Durante la inspección técnica del ${checklist.nombre} no se registraron componentes en condición mala.`,
          itemsBuenos.length > 0
            ? `Los componentes evaluados como buenos permiten continuar con la revisión operacional del equipo.`
            : `No se registraron fallas en el checklist completado.`,
          `Se recomienda realizar prueba final de funcionamiento antes de liberar el equipo.`
        ].join("\n\n")
      : [
          `Durante la inspección técnica del ${checklist.nombre} se identificaron las siguientes condiciones anómalas:`,
          detalleFallas.join("\n"),
          requiereRetiroServicio
            ? `Debido a que una o más fallas afectan componentes críticos de seguridad, se recomienda mantener el equipo fuera de servicio hasta ejecutar la reparación correspondiente y realizar las pruebas finales.`
            : `Las fallas detectadas deben corregirse antes de la liberación final del equipo.`,
        ].join("\n\n");

  return {
    tipoEquipo,
    nombreEquipo: checklist.nombre,
    resumen,
    diagnosticoTecnico,
    procedimientoRecomendado,
    repuestosSugeridos,
    criticidad,
    requiereRetiroServicio,
    itemsMalos: itemsMalos.map(({ item, respuesta }) => ({
      id: item.id,
      label: item.label,
      sistema: item.sistema,
      criticidad: item.criticidad,
      afectaSeguridad: item.afectaSeguridad,
      observacion: respuesta?.observacion || "",
      repuestosSugeridos: item.repuestosSugeridos || [],
      procedimientosSugeridos: item.procedimientosSugeridos || [],
    })),
  };
}