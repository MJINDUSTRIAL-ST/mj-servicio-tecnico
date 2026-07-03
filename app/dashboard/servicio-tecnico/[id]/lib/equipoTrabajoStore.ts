export type EquipoTrabajoData = {
  checklist?: any;

  diagnostico?: {
    hallazgos?: string;
    procedimiento?: string;
    repuestos?: string;
  };

  revision?: {
    aprobado?: boolean;
    motivo?: string;
    horas_hombre?: number | null;
    procedimiento_aprobado?: string;
    repuestos_aprobados?: string;
  };

  cotizacion?: {
    items?: any[];
  };

  trabajo?: {
    trabajo_realizado?: string;
    repuestos_utilizados?: string;
    observaciones?: string;
    prueba_funcional?: boolean;
    prueba_carga?: boolean;
    equipo_liberado?: boolean;
  };

  updated_at?: string;
};

function key(equipoId: string) {
  return `equipo-trabajo-${equipoId}`;
}

export function obtenerEquipoTrabajo(equipoId: string): EquipoTrabajoData {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(key(equipoId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function guardarEquipoTrabajo(
  equipoId: string,
  data: Partial<EquipoTrabajoData>
) {
  if (typeof window === "undefined") return;

  const actual = obtenerEquipoTrabajo(equipoId);

  const nuevo: EquipoTrabajoData = {
    ...actual,
    ...data,
    diagnostico: {
      ...actual.diagnostico,
      ...data.diagnostico,
    },
    revision: {
      ...actual.revision,
      ...data.revision,
    },
    cotizacion: {
      ...actual.cotizacion,
      ...data.cotizacion,
    },
    trabajo: {
      ...actual.trabajo,
      ...data.trabajo,
    },
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(key(equipoId), JSON.stringify(nuevo));
}

export function generarDiagnosticoBaseDesdeChecklist(payload: any) {
  const respuestas = Object.values(payload?.respuestas || {}) as any[];
  const itemsMalos = payload?.itemsMalos || [];

  const repuestos = respuestas
    .filter((respuesta) => respuesta.acciones?.includes("repuesto"))
    .map((respuesta) => {
      const cantidad = respuesta.repuesto_cantidad || "1";
      const nombre = respuesta.repuesto_nombre || "Repuesto sin especificar";
      return `${cantidad} x ${nombre}`;
    })
    .join("\n");

  const acciones = respuestas
    .filter((respuesta) => respuesta.acciones?.length)
    .map((respuesta) => {
      const accionesTexto = respuesta.acciones
        .filter((accion: string) => accion !== "repuesto")
        .map((accion: string) => {
          if (accion === "reparacion") return "Reparación";
          if (accion === "ajuste") return "Ajuste";
          if (accion === "mantencion") return "Mantención";
          if (accion === "otro") return respuesta.accion_otro || "Otro";
          return accion;
        })
        .filter(Boolean)
        .join(", ");

      return accionesTexto;
    })
    .filter(Boolean)
    .join("\n");

  const hallazgos =
    itemsMalos.length > 0
      ? `Durante la inspección del equipo se detectaron ${itemsMalos.length} componente(s) en mal estado que requieren intervención técnica.`
      : "No se detectaron componentes en mal estado durante el checklist.";

  const procedimientoPartes = [];

  if (repuestos) {
    procedimientoPartes.push(`Repuestos solicitados:\n${repuestos}`);
  }

  if (acciones) {
    procedimientoPartes.push(`Acciones requeridas:\n${acciones}`);
  }

  const procedimiento =
    procedimientoPartes.length > 0
      ? `Se recomienda revisar los componentes observados y ejecutar las acciones correspondientes antes de liberar el equipo.\n\n${procedimientoPartes.join(
          "\n\n"
        )}`
      : "Se recomienda realizar revisión funcional general antes de liberar el equipo.";

  return {
    hallazgos,
    procedimiento,
    repuestos,
  };
}