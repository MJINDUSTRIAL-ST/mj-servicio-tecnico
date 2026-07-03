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
  const itemsMalos = payload?.itemsMalos || [];

  const repuestos: string[] = [];
  const acciones: string[] = [];

  itemsMalos.forEach((registro: any) => {
    const item = registro.item || {};
    const respuesta = registro.respuesta || {};

    const nombreItem =
      item.nombre ||
      item.titulo ||
      item.label ||
      item.name ||
      item.id ||
      "Ítem observado";

    const accionesItem = respuesta.acciones || [];

    accionesItem.forEach((accion: string) => {
      if (accion === "repuesto") {
        const cantidad = respuesta.repuesto_cantidad || "1";
        const nombre = respuesta.repuesto_nombre || nombreItem;
        repuestos.push(`${cantidad} x ${nombre}`);
      }

      if (accion === "reparacion") {
        acciones.push(`Reparación - ${nombreItem}`);
      }

      if (accion === "ajuste") {
        acciones.push(`Ajuste - ${nombreItem}`);
      }

      if (accion === "mantencion") {
        acciones.push(`Mantención - ${nombreItem}`);
      }

      if (accion === "otro") {
        acciones.push(`${respuesta.accion_otro || "Otro"} - ${nombreItem}`);
      }
    });
  });

  const hallazgos =
    itemsMalos.length > 0
      ? `Durante la inspección del equipo se detectaron ${itemsMalos.length} componente(s) en mal estado que requieren intervención técnica.`
      : "No se detectaron componentes en mal estado durante el checklist.";

  const procedimientoPartes: string[] = [];

  if (acciones.length > 0) {
    procedimientoPartes.push(`Acciones requeridas:\n${acciones.join("\n")}`);
  }

  if (repuestos.length > 0) {
    procedimientoPartes.push(`Repuestos solicitados:\n${repuestos.join("\n")}`);
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
    repuestos: repuestos.join("\n"),
  };
}