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

  const hallazgos =
    itemsMalos.length > 0
      ? `Durante la inspección del equipo se detectaron ${itemsMalos.length} componente(s) en mal estado que requieren revisión técnica.`
      : "No se detectaron componentes en mal estado durante el checklist.";

  const procedimiento = repuestos
    ? `Se recomienda revisar los componentes observados, realizar el reemplazo o reparación correspondiente y efectuar prueba funcional antes de liberar el equipo.\n\nRepuestos solicitados:\n${repuestos}`
    : "Se recomienda realizar revisión funcional general antes de liberar el equipo.";

  return {
    hallazgos,
    procedimiento,
    repuestos,
  };
}