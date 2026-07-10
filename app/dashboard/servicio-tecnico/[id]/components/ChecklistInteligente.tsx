"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  CHECKLISTS,
  ChecklistEquipo,
  ChecklistItem,
  EstadoChecklist,
  TipoEquipoChecklist,
  getChecklistByTipo,
} from "../lib/checklists";
import { DiagnosticoGeneradoMJ } from "../lib/diagnosticoEngine";
import { obtenerRepuestoSugerido } from "../lib/repuestosSugeridos";

type AccionChecklist =
  "repuesto" | "reparacion" | "ajuste" | "mantencion" | "otro";

type FotoChecklistGuardada = {
  id?: string;
  nombre: string;
  url: string;
  storage_path?: string | null;
  item_id?: string | null;
  item_label?: string | null;
  observacion?: string | null;
  guardada: true;
};

type FotoChecklist = File | FotoChecklistGuardada;

type RespuestaChecklist = {
  estado: EstadoChecklist | "";
  observacion: string;
  fotos: FotoChecklist[];
  acciones: AccionChecklist[];
  repuesto_nombre: string;
  repuesto_cantidad: string;
  accion_otro: string;
};

type RespuestasChecklist = Record<string, RespuestaChecklist>;

type DiagnosticoIASenior = {
  resumenEjecutivo?: {
    equipoLlegado?: string;
    estadoGeneral?: string;
    nivelRiesgo?: string;
    conclusion?: string;
  };
  hallazgosTecnicos?: Array<{
    categoria?: string;
    estado?: string;
    detalle?: string;
    evidenciaChecklist?: string[];
    severidad?: string;
  }>;
  causaProbable?: Array<{
    causa?: string;
    justificacion?: string;
    confianza?: string;
  }>;
  riesgo?: {
    clasificacion?: string;
    justificacion?: string;
  };
  procedimientoRecomendado?: Array<{
    paso?: number;
    trabajo?: string;
    prioridad?: string;
    requiereRepuesto?: boolean;
    observacion?: string;
  }>;
  repuestosSugeridos?: Array<{
    cantidad?: number;
    nombre?: string;
    prioridad?: string;
    motivo?: string;
  }>;
  horasEstimadas?: {
    minimo?: number;
    maximo?: number;
    detalle?: string;
    supuesto?: string;
  };
  observacionesCliente?: string;
  textoTecnicoNatural?: string;
  confianzaDiagnostico?: string;
  conocimientoUtilizado?: Array<{
    casoId?: string;
    similitud?: number;
    aprendizaje?: string;
  }>;
  advertencias?: string[];
};

type RespuestaDiagnosticoIA = {
  ok?: boolean;
  fuente?: string;
  diagnostico?: DiagnosticoIASenior;
  resultado?: any;
  conocimientoHistoricoUsado?: number;
};

function textoSeguro(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function esFotoArchivo(foto: FotoChecklist): foto is File {
  return typeof File !== "undefined" && foto instanceof File;
}

function esFotoGuardada(foto: FotoChecklist): foto is FotoChecklistGuardada {
  return !esFotoArchivo(foto) && Boolean((foto as FotoChecklistGuardada)?.guardada);
}

function nombreFotoChecklist(foto: FotoChecklist) {
  if (esFotoArchivo(foto)) return foto.name || "Foto checklist";
  return foto.nombre || foto.item_label || "Foto checklist";
}

function limpiarNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function crearFotoGuardadaDesdeRegistro(registro: any): FotoChecklistGuardada | null {
  const url = textoSeguro(
    registro?.url || registro?.foto_url || registro?.public_url || registro?.publicUrl,
  );

  if (!url) return null;

  return {
    id: registro?.id ? String(registro.id) : undefined,
    nombre: textoSeguro(registro?.nombre || registro?.name || registro?.filename) || "Foto checklist",
    url,
    storage_path: registro?.storage_path || null,
    item_id: registro?.item_id || null,
    item_label: registro?.item_label || null,
    observacion: registro?.observacion || null,
    guardada: true,
  };
}

function claveFotoGuardada(foto: FotoChecklistGuardada) {
  return foto.id || foto.storage_path || foto.url;
}

function unirLineas(lineas: Array<string | null | undefined>): string {
  return lineas.map(textoSeguro).filter(Boolean).join("\n");
}

function normalizarTextoMJ(valor: unknown): string {
  return textoSeguro(valor)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nombreItemTecnico(registro: {
  item: ChecklistItem;
  respuesta: RespuestaChecklist;
}) {
  const item = registro.item as any;

  return (
    textoSeguro(item.label) ||
    textoSeguro(item.nombre) ||
    textoSeguro(item.titulo) ||
    textoSeguro(item.name) ||
    textoSeguro(item.id) ||
    "ítem observado"
  );
}

function observacionItemTecnico(registro: {
  item: ChecklistItem;
  respuesta: RespuestaChecklist;
}) {
  return textoSeguro(registro.respuesta.observacion);
}

function prioridadItemTecnico(registro: {
  item: ChecklistItem;
  respuesta: RespuestaChecklist;
}) {
  const item = registro.item as any;
  const nombre = normalizarTextoMJ(nombreItemTecnico(registro));

  if (
    item.afectaSeguridad ||
    nombre.includes("freno") ||
    nombre.includes("gancho") ||
    nombre.includes("cable") ||
    nombre.includes("cadena") ||
    nombre.includes("limitador") ||
    nombre.includes("carcasa") ||
    nombre.includes("estructura")
  ) {
    return "alta";
  }

  return "media";
}

function accionLegible(accion: AccionChecklist | string) {
  if (accion === "repuesto") return "reemplazo";
  if (accion === "reparacion") return "reparación";
  if (accion === "ajuste") return "ajuste";
  if (accion === "mantencion") return "mantención";
  if (accion === "otro") return "acción técnica";
  return textoSeguro(accion) || "revisión";
}


function descripcionFallaPorComponente(nombreOriginal: string, observacionOriginal: string) {
  const nombre = normalizarTextoMJ(nombreOriginal);
  const observacion = textoSeguro(observacionOriginal);

  if (nombre.includes("cable")) {
    return `El ${nombreOriginal.toLowerCase()} está dañado y debe ser reemplazado de inmediato para evitar fallas estructurales que comprometan la integridad de la carga y la seguridad del personal.`;
  }

  if (nombre.includes("botonera")) {
    return observacion
      ? `La ${nombreOriginal.toLowerCase()} presenta ${observacion.toLowerCase()}, lo cual puede provocar desconexiones accidentales o fallos en el control remoto, generando riesgos operativos.`
      : `La ${nombreOriginal.toLowerCase()} presenta una condición deficiente, lo cual puede provocar fallos de control durante la operación.`;
  }

  if (nombre.includes("freno")) {
    return `El ${nombreOriginal.toLowerCase()} no funciona adecuadamente, afectando la capacidad de detener la carga, lo que puede ocasionar accidentes graves.`;
  }

  if (nombre.includes("enchufe") || nombre.includes("alimentador")) {
    return `Se recomienda además reemplazar el ${nombreOriginal.toLowerCase()} para garantizar una conexión eléctrica segura y confiable.`;
  }

  if (nombre.includes("carcasa") || nombre.includes("estructura")) {
    return observacion
      ? `Se detectan daños en la ${nombreOriginal.toLowerCase()} (${observacion.toLowerCase()}), por lo que se recomienda su reparación para evitar daños mayores.`
      : `Se detectan daños en la ${nombreOriginal.toLowerCase()}, por lo que se recomienda su reparación para evitar daños mayores.`;
  }

  if (nombre.includes("limpieza") || nombre.includes("suciedad")) {
    return `Se requiere una limpieza integral para mantener condiciones óptimas de trabajo.`;
  }

  if (observacion) {
    return `El componente ${nombreOriginal.toLowerCase()} presenta la siguiente observación: ${observacion}.`;
  }

  return `El componente ${nombreOriginal.toLowerCase()} presenta una condición deficiente y debe ser corregido antes de liberar el equipo.`;
}

function procedimientoPorComponente(nombreOriginal: string, accion: AccionChecklist | string) {
  const nombre = normalizarTextoMJ(nombreOriginal);

  if (nombre.includes("cable")) {
    return "Reemplazo del cable de acero por uno nuevo certificado.";
  }

  if (nombre.includes("botonera")) {
    return "Ajuste y aseguramiento de los tornillos en la botonera colgante.";
  }

  if (nombre.includes("freno")) {
    return "Mantenimiento y reparación del freno magnético para restaurar su función.";
  }

  if (nombre.includes("enchufe") || nombre.includes("alimentador")) {
    return "Cambio del enchufe alimentador por uno nuevo adecuado.";
  }

  if (nombre.includes("carcasa") || nombre.includes("estructura")) {
    return "Reparación de golpes en la carcasa para evitar daños mayores.";
  }

  if (nombre.includes("limpieza") || nombre.includes("suciedad")) {
    return "Limpieza general del equipo para mejorar condiciones de trabajo.";
  }

  if (accion === "repuesto") {
    return `Reemplazo de ${nombreOriginal.toLowerCase()} por componente nuevo compatible.`;
  }

  if (accion === "reparacion") {
    return `Reparación de ${nombreOriginal.toLowerCase()} y validación posterior de funcionamiento.`;
  }

  if (accion === "ajuste") {
    return `Ajuste de ${nombreOriginal.toLowerCase()} y verificación posterior.`;
  }

  if (accion === "mantencion") {
    return `Mantención de ${nombreOriginal.toLowerCase()} y prueba funcional posterior.`;
  }

  return `Revisión y corrección de ${nombreOriginal.toLowerCase()} según condición detectada.`;
}

function crearDiagnosticoVisibleTecnicoDesdeChecklist(
  tipoEquipo: TipoEquipoChecklist,
  checklist: ChecklistEquipo,
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
  diagnosticoSenior?: DiagnosticoIASenior | null,
): DiagnosticoGeneradoMJ {
  const nombreEquipo = (checklist.nombre || tipoEquipo || "equipo").toLowerCase();
  const itemsConFalla = itemsMalosActuales.filter(
    (registro) => registro.respuesta.estado === "malo",
  );

  if (!itemsConFalla.length) {
    const textoSinFallas =
      textoSeguro(diagnosticoSenior?.textoTecnicoNatural) ||
      `El ${nombreEquipo} no presenta deficiencias críticas registradas en el checklist. Se recomienda realizar una prueba funcional final antes de liberar el equipo.`;

    return {
      tipoEquipo,
      nombreEquipo: checklist.nombre,
      resumen: textoSinFallas,
      diagnosticoTecnico: textoSinFallas,
      procedimientoRecomendado: [
        "Realizar prueba funcional final del equipo antes de liberar.",
      ] as any,
      repuestosSugeridos: [] as any,
      criticidad: "baja",
      requiereRetiroServicio: false,
      itemsMalos: itemsMalosActuales as any,
    };
  }

  const criticos = itemsConFalla.filter(
    (registro) => prioridadItemTecnico(registro) === "alta",
  );
  const noCriticos = itemsConFalla.filter(
    (registro) => prioridadItemTecnico(registro) !== "alta",
  );

  const frasesCriticas = criticos.map((registro) =>
    descripcionFallaPorComponente(
      nombreItemTecnico(registro),
      observacionItemTecnico(registro),
    ),
  );

  const frasesNoCriticas = noCriticos.map((registro) =>
    descripcionFallaPorComponente(
      nombreItemTecnico(registro),
      observacionItemTecnico(registro),
    ),
  );

  const inicio = criticos.length
    ? `El ${nombreEquipo} presenta varias deficiencias críticas en componentes esenciales para su operación segura.`
    : `El ${nombreEquipo} presenta observaciones técnicas que deben corregirse antes de su liberación.`;

  const cierre = criticos.length
    ? "Estas condiciones requieren atención inmediata para mantener la operatividad segura del equipo."
    : "Estas condiciones deben ser corregidas y validadas mediante prueba funcional antes de liberar el equipo.";

  const diagnosticoTecnico = unirLineas([
    inicio,
    ...frasesCriticas,
    ...frasesNoCriticas,
    cierre,
  ]).replace(/\n/g, " ");

  const procedimientos = itemsConFalla.map((registro) => {
    const acciones = registro.respuesta.acciones || [];
    const accionPrincipal = acciones[0] || "revisión técnica";

    return procedimientoPorComponente(
      nombreItemTecnico(registro),
      accionPrincipal,
    );
  });

  const procedimientosUnicos = Array.from(new Set(procedimientos));
  const repuestos = crearRepuestosTecnicoNatural(itemsConFalla);
  const criticidad = criticos.length ? "alta" : "media";

  return {
    tipoEquipo,
    nombreEquipo: checklist.nombre,
    resumen: diagnosticoTecnico,
    diagnosticoTecnico,
    procedimientoRecomendado: procedimientosUnicos as any,
    repuestosSugeridos: repuestos as any,
    criticidad,
    requiereRetiroServicio: criticos.length > 0,
    itemsMalos: itemsMalosActuales as any,
  };
}

function crearHallazgoTecnicoNatural(
  tipoEquipo: TipoEquipoChecklist,
  checklist: ChecklistEquipo,
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
  diagnostico: DiagnosticoIASenior,
) {
  const equipo = (checklist.nombre || tipoEquipo || "equipo").toLowerCase();

  if (!itemsMalosActuales.length) {
    return (
      textoSeguro(diagnostico.textoTecnicoNatural) ||
      `El ${equipo} no presenta observaciones críticas registradas en el checklist. Se recomienda realizar validación funcional final antes de liberar el equipo.`
    );
  }

  const componentes = itemsMalosActuales.map(nombreItemTecnico);
  const componentesTexto = componentes.join(", ");

  const observacionesTexto = itemsMalosActuales
    .map((registro) => {
      const nombre = nombreItemTecnico(registro);
      const observacion = observacionItemTecnico(registro);
      return observacion ? `${nombre}: ${observacion}` : nombre;
    })
    .join("; ");

  const hayRiesgoAlto = itemsMalosActuales.some(
    (registro) => prioridadItemTecnico(registro) === "alta",
  );

  const cierre = hayRiesgoAlto
    ? "Estas condiciones pueden comprometer la operación segura del equipo, por lo que no se recomienda liberarlo hasta realizar las correcciones y una prueba funcional posterior."
    : "Se recomienda corregir las observaciones indicadas y validar el funcionamiento antes de liberar el equipo.";

  return unirLineas([
    `El ${equipo} presenta observaciones técnicas en los siguientes componentes: ${componentesTexto}.`,
    observacionesTexto ? `Durante la revisión se detectó: ${observacionesTexto}.` : "",
    cierre,
  ]);
}

function crearProcedimientoTecnicoNatural(
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
) {
  if (!itemsMalosActuales.length) {
    return ["Realizar prueba funcional final del equipo antes de liberar."];
  }

  const trabajos = itemsMalosActuales.map((registro, index) => {
    const nombre = nombreItemTecnico(registro);
    const acciones = registro.respuesta.acciones || [];
    const accionesTexto = acciones.length
      ? acciones.map(accionLegible).join(" / ")
      : "revisión técnica";
    const observacion = observacionItemTecnico(registro);
    const prioridad = prioridadItemTecnico(registro);

    return unirLineas([
      `${index + 1}. Realizar ${accionesTexto} en ${nombre}.`,
      `Prioridad: ${prioridad}`,
      acciones.includes("repuesto") ? "Requiere repuesto" : "No requiere repuesto obligatorio",
      observacion ? `Observación: ${observacion}` : "",
    ]);
  });

  trabajos.push("Realizar prueba funcional y validación de seguridad antes de liberar el equipo.");

  return trabajos;
}

function crearRepuestosTecnicoNatural(
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
) {
  return itemsMalosActuales
    .filter((registro) => registro.respuesta.acciones?.includes("repuesto"))
    .map((registro) => {
      const cantidad = textoSeguro(registro.respuesta.repuesto_cantidad) || "1";
      const nombre =
        textoSeguro(registro.respuesta.repuesto_nombre) ||
        nombreItemTecnico(registro);
      const motivo =
        observacionItemTecnico(registro) ||
        `${nombreItemTecnico(registro)} marcado como malo en checklist.`;
      const prioridad = prioridadItemTecnico(registro);

      return `${cantidad} x ${nombre} | Prioridad: ${prioridad} | Motivo: ${motivo}`;
    });
}

function formatearHallazgosSenior(diagnostico: DiagnosticoIASenior): string {
  const hallazgos = diagnostico.hallazgosTecnicos || [];

  if (!hallazgos.length) {
    return "Sin hallazgos técnicos estructurados informados por IA.";
  }

  return hallazgos
    .map((hallazgo, index) => {
      return unirLineas([
        `${index + 1}. ${hallazgo.categoria || "General"}`,
        hallazgo.estado ? `Estado: ${hallazgo.estado}` : "",
        hallazgo.severidad ? `Severidad: ${hallazgo.severidad}` : "",
        hallazgo.detalle ? `Detalle: ${hallazgo.detalle}` : "",
        hallazgo.evidenciaChecklist?.length
          ? `Evidencia checklist: ${hallazgo.evidenciaChecklist.join(", ")}`
          : "",
      ]);
    })
    .join("\n\n");
}

function formatearCausasSenior(diagnostico: DiagnosticoIASenior): string {
  const causas = diagnostico.causaProbable || [];

  if (!causas.length) return "";

  return causas
    .map((causa, index) =>
      unirLineas([
        `${index + 1}. ${causa.causa || "Causa probable"}`,
        causa.justificacion ? `Justificación: ${causa.justificacion}` : "",
        causa.confianza ? `Confianza: ${causa.confianza}` : "",
      ]),
    )
    .join("\n\n");
}

function formatearProcedimientoSenior(diagnostico: DiagnosticoIASenior): string[] {
  const procedimiento = diagnostico.procedimientoRecomendado || [];

  return procedimiento.map((paso, index) =>
    unirLineas([
      `${paso.paso || index + 1}. ${paso.trabajo || "Trabajo recomendado"}`,
      paso.prioridad ? `Prioridad: ${paso.prioridad}` : "",
      paso.requiereRepuesto ? "Requiere repuesto" : "No requiere repuesto",
      paso.observacion ? `Observación: ${paso.observacion}` : "",
    ]),
  );
}

function formatearRepuestosSenior(diagnostico: DiagnosticoIASenior): string[] {
  const repuestos = diagnostico.repuestosSugeridos || [];

  return repuestos.map((repuesto) =>
    [
      `${repuesto.cantidad || 1} x ${repuesto.nombre || "Repuesto sugerido"}`,
      repuesto.prioridad ? `Prioridad: ${repuesto.prioridad}` : "",
      repuesto.motivo ? `Motivo: ${repuesto.motivo}` : "",
    ]
      .filter(Boolean)
      .join(" | "),
  );
}

function criticidadDesdeDiagnosticoSenior(
  diagnostico: DiagnosticoIASenior,
): "baja" | "media" | "alta" | "critica" {
  const nivel = textoSeguro(diagnostico.resumenEjecutivo?.nivelRiesgo)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const clasificacion = textoSeguro(diagnostico.riesgo?.clasificacion)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (nivel === "critico") return "critica";
  if (nivel === "alto" || clasificacion === "no apto") return "alta";
  if (nivel === "medio" || clasificacion === "apto con observaciones") {
    return "media";
  }

  return "baja";
}

function requiereRetiroDesdeDiagnosticoSenior(
  diagnostico: DiagnosticoIASenior,
): boolean {
  const clasificacion = textoSeguro(diagnostico.riesgo?.clasificacion)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const nivel = textoSeguro(diagnostico.resumenEjecutivo?.nivelRiesgo)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return clasificacion === "no apto" || nivel === "critico" || nivel === "alto";
}

function convertirDiagnosticoIASeniorAFormatoMJ(
  diagnostico: DiagnosticoIASenior,
  tipoEquipo: TipoEquipoChecklist,
  checklist: ChecklistEquipo,
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
): DiagnosticoGeneradoMJ {
  return crearDiagnosticoVisibleTecnicoDesdeChecklist(
    tipoEquipo,
    checklist,
    itemsMalosActuales,
    diagnostico,
  );
}

function convertirResultadoAnteriorAFormatoMJ(
  resultadoIA: any,
  tipoEquipo: TipoEquipoChecklist,
  checklist: ChecklistEquipo,
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
): DiagnosticoGeneradoMJ {
  if (itemsMalosActuales.length > 0) {
    return crearDiagnosticoVisibleTecnicoDesdeChecklist(
      tipoEquipo,
      checklist,
      itemsMalosActuales,
      null,
    );
  }

  const hallazgosIA =
    resultadoIA.hallazgos ||
    resultadoIA.diagnosticoTecnico ||
    "Diagnóstico generado por IA sin hallazgos estructurados.";

  const trabajosIA = Array.isArray(resultadoIA.trabajosRequeridos)
    ? resultadoIA.trabajosRequeridos
    : Array.isArray(resultadoIA.procedimientoRecomendado)
      ? resultadoIA.procedimientoRecomendado
      : [];

  const repuestosIA = Array.isArray(resultadoIA.repuestosSugeridos)
    ? resultadoIA.repuestosSugeridos
    : [];

  const criticidadIA =
    resultadoIA.criticidad === "critica" ||
    resultadoIA.criticidad === "alta" ||
    resultadoIA.criticidad === "media" ||
    resultadoIA.criticidad === "baja"
      ? resultadoIA.criticidad
      : "media";

  const estadoFinalIA =
    resultadoIA.estadoFinal === "no_apto"
      ? "no_apto"
      : resultadoIA.estadoFinal === "apto"
        ? "apto"
        : "observaciones";

  return {
    tipoEquipo,
    nombreEquipo: checklist.nombre,
    resumen: resultadoIA.resumenCliente || resultadoIA.resumen || hallazgosIA,
    diagnosticoTecnico: hallazgosIA,
    procedimientoRecomendado: trabajosIA as any,
    repuestosSugeridos: repuestosIA as any,
    criticidad: criticidadIA,
    requiereRetiroServicio: estadoFinalIA === "no_apto",
    itemsMalos: itemsMalosActuales as any,
  };
}

function crearDiagnosticoDesdeRespuestaIA(
  data: RespuestaDiagnosticoIA,
  tipoEquipo: TipoEquipoChecklist,
  checklist: ChecklistEquipo,
  itemsMalosActuales: Array<{
    item: ChecklistItem;
    respuesta: RespuestaChecklist;
  }>,
): DiagnosticoGeneradoMJ {
  if (data.diagnostico?.resumenEjecutivo || data.diagnostico?.hallazgosTecnicos) {
    return convertirDiagnosticoIASeniorAFormatoMJ(
      data.diagnostico,
      tipoEquipo,
      checklist,
      itemsMalosActuales,
    );
  }

  if (data.resultado) {
    return convertirResultadoAnteriorAFormatoMJ(
      data.resultado,
      tipoEquipo,
      checklist,
      itemsMalosActuales,
    );
  }

  if (data.diagnostico) {
    return convertirResultadoAnteriorAFormatoMJ(
      data.diagnostico,
      tipoEquipo,
      checklist,
      itemsMalosActuales,
    );
  }

  throw new Error("La IA no entregó diagnóstico utilizable.");
}



function incorporarObservacionesGenerales(
  diagnostico: DiagnosticoGeneradoMJ,
  observacionesGenerales: string,
): DiagnosticoGeneradoMJ {
  const observaciones = textoSeguro(observacionesGenerales);

  if (!observaciones) {
    return diagnostico;
  }

  const textoObservaciones = `Observaciones generales del técnico: ${observaciones}`;

  return {
    ...diagnostico,
    resumen: unirLineas([diagnostico.resumen, textoObservaciones]).replace(/\n/g, " "),
    diagnosticoTecnico: unirLineas([
      diagnostico.diagnosticoTecnico || diagnostico.resumen,
      textoObservaciones,
    ]).replace(/\n/g, " "),
  };
}

type ChecklistInteligenteProps = {
  tipoEquipoInicial?: string | null;
  equipoId?: string | null;
  onProgreso?: (porcentaje: number) => void;
  onGenerarDiagnostico?: (payload: {
    equipoId?: string | null;
    tipoEquipo: TipoEquipoChecklist;
    checklist: ChecklistEquipo;
    respuestas: RespuestasChecklist;
    itemsMalos: Array<{
      item: ChecklistItem;
      respuesta: RespuestaChecklist;
    }>;
    diagnostico: DiagnosticoGeneradoMJ;
    observacionesGenerales?: string;
    diagnosticoIASenior?: DiagnosticoIASenior | null;
    fuenteIA?: string;
    tecnicoACargo?: string;
  }) => void;
};

const OTRAS_FOTOS_CHECKLIST_ID = "otras_fotos_checklist";

const ACCIONES: Array<{ value: AccionChecklist; label: string }> = [
  { value: "repuesto", label: "Repuesto" },
  { value: "reparacion", label: "Reparación" },
  { value: "ajuste", label: "Ajuste" },
  { value: "mantencion", label: "Mantención" },
  { value: "otro", label: "Otro" },
];

const TECNICOS_MJ = [
  "Gustavo Santana",
  "Alvaro Quezada",
  "Jonathan Fonseca",
  "Sergio Gonzalez",
  "Claudia Salazar",
  "Andres Berdejo",
];

function normalizarTipoEquipo(
  tipo: string | null | undefined,
): TipoEquipoChecklist | "" {
  if (!tipo) return "";

  const value = tipo.toLowerCase().trim();

  const equivalencias: Record<string, TipoEquipoChecklist> = {
    "tecle electrico": "tecle_electrico",
    "tecle eléctrico": "tecle_electrico",
    tecle_electrico: "tecle_electrico",
    "tecle manual": "tecle_manual",
    tecle_manual: "tecle_manual",
    "tecle de palanca": "tecle_palanca",
    "tecle palanca": "tecle_palanca",
    tecle_palanca: "tecle_palanca",
    winche: "winche",
    tirfor: "tirfor",
    minifor: "minifor",
    "transpaleta electrica": "transpaleta_electrica",
    "transpaleta eléctrica": "transpaleta_electrica",
    transpaleta: "transpaleta_electrica",
    transpaleta_electrica: "transpaleta_electrica",
  };

  return equivalencias[value] ?? "";
}

function crearRespuestaVacia(): RespuestaChecklist {
  return {
    estado: "",
    observacion: "",
    fotos: [],
    acciones: [],
    repuesto_nombre: "",
    repuesto_cantidad: "1",
    accion_otro: "",
  };
}

function crearRespuestasVacias(
  checklist: ChecklistEquipo | null,
): RespuestasChecklist {
  if (!checklist) return {};

  const respuestas: RespuestasChecklist = {};

  checklist.sections.forEach((section) => {
    section.items.forEach((item) => {
      respuestas[item.id] = crearRespuestaVacia();
    });
  });

  return respuestas;
}

function normalizarRespuestaGuardada(
  respuesta: Partial<RespuestaChecklist> | undefined,
): RespuestaChecklist {
  return {
    estado: respuesta?.estado ?? "",
    observacion: respuesta?.observacion ?? "",
    fotos: [],
    acciones: respuesta?.acciones ?? [],
    repuesto_nombre: respuesta?.repuesto_nombre ?? "",
    repuesto_cantidad: respuesta?.repuesto_cantidad ?? "1",
    accion_otro: respuesta?.accion_otro ?? "",
  };
}

function serializarRespuestas(respuestas: RespuestasChecklist) {
  const serializadas: Record<string, Omit<RespuestaChecklist, "fotos">> = {};

  Object.entries(respuestas).forEach(([itemId, respuesta]) => {
    serializadas[itemId] = {
      estado: respuesta.estado,
      observacion: respuesta.observacion,
      acciones: respuesta.acciones,
      repuesto_nombre: respuesta.repuesto_nombre,
      repuesto_cantidad: respuesta.repuesto_cantidad,
      accion_otro: respuesta.accion_otro,
    };
  });

  return serializadas;
}

export default function ChecklistInteligente({
  tipoEquipoInicial,
  equipoId,
  onProgreso,
  onGenerarDiagnostico,
}: ChecklistInteligenteProps) {
  const tipoEquipo = normalizarTipoEquipo(tipoEquipoInicial);

  const checklist = useMemo(() => {
    return tipoEquipo ? getChecklistByTipo(tipoEquipo) : null;
  }, [tipoEquipo]);

  const [respuestas, setRespuestas] = useState<RespuestasChecklist>(() =>
    crearRespuestasVacias(tipoEquipo ? CHECKLISTS[tipoEquipo] : null),
  );

  const [cargadoStorage, setCargadoStorage] = useState(false);
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<
    Record<string, boolean>
  >({});
  const [diagnosticoGenerado, setDiagnosticoGenerado] =
    useState<DiagnosticoGeneradoMJ | null>(null);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [usoRespaldoLocal, setUsoRespaldoLocal] = useState(false);
  const [otrasObservaciones, setOtrasObservaciones] = useState("");
  const [tecnicoACargo, setTecnicoACargo] = useState("");
  const [guardandoTecnico, setGuardandoTecnico] = useState(false);
  const [cargandoFotosGuardadas, setCargandoFotosGuardadas] = useState(false);
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);

  const totalItems =
    checklist?.sections.reduce(
      (total, section) => total + section.items.length,
      0,
    ) ?? 0;

  const itemsRespondidos = Object.values(respuestas).filter(
    (respuesta) => respuesta.estado,
  ).length;

  const itemsMalos = useMemo(() => {
    if (!checklist) return [];

    return checklist.sections.flatMap((section) =>
      section.items
        .map((item) => ({
          item,
          respuesta: respuestas[item.id],
        }))
        .filter((registro) => registro.respuesta?.estado === "malo"),
    );
  }, [checklist, respuestas]);

  const porcentajeAvance =
    totalItems > 0 ? Math.round((itemsRespondidos / totalItems) * 100) : 0;

  const otrasFotosChecklist = respuestas[OTRAS_FOTOS_CHECKLIST_ID]?.fotos ?? [];

  useEffect(() => {
    onProgreso?.(porcentajeAvance);
  }, [porcentajeAvance, onProgreso]);

  useEffect(() => {
    if (!equipoId) {
      setTecnicoACargo("");
      return;
    }

    let activo = true;

    async function cargarTecnico() {
      const tecnicoLocal = localStorage.getItem(`tecnico-a-cargo-${equipoId}`);

      if (tecnicoLocal && activo) {
        setTecnicoACargo(tecnicoLocal);
      }

      const { data, error } = await supabase
        .from("ordenes")
        .select("tecnico_a_cargo")
        .eq("id", equipoId)
        .maybeSingle();

      if (!activo) return;

      if (error) {
        console.error("No se pudo cargar el técnico a cargo:", error);
        return;
      }

      const tecnicoGuardado =
        (data as { tecnico_a_cargo?: string | null } | null)?.tecnico_a_cargo ||
        "";

      setTecnicoACargo(tecnicoGuardado);
      localStorage.setItem(`tecnico-a-cargo-${equipoId}`, tecnicoGuardado);
    }

    cargarTecnico();

    return () => {
      activo = false;
    };
  }, [equipoId]);

  useEffect(() => {
    const base = crearRespuestasVacias(
      tipoEquipo ? CHECKLISTS[tipoEquipo] : null,
    );

    if (!equipoId) {
      setRespuestas(base);
      setOtrasObservaciones("");
      setCargadoStorage(true);
      return;
    }

    try {
      const guardado = localStorage.getItem(`checklist-${equipoId}`);
      const observacionesGuardadas = localStorage.getItem(
        `checklist-observaciones-${equipoId}`,
      );

      setOtrasObservaciones(observacionesGuardadas || "");

      if (!guardado) {
        setRespuestas(base);
        setCargadoStorage(true);
        return;
      }

      const parsed = JSON.parse(guardado) as Record<
        string,
        Partial<RespuestaChecklist>
      >;

      const mezclado: RespuestasChecklist = { ...base };

      Object.keys(base).forEach((itemId) => {
        mezclado[itemId] = normalizarRespuestaGuardada(parsed[itemId]);
      });

      setRespuestas(mezclado);
    } catch {
      setRespuestas(base);
    } finally {
      setCargadoStorage(true);
    }
  }, [equipoId, tipoEquipo]);

  useEffect(() => {
    if (!equipoId || !cargadoStorage) return;

    localStorage.setItem(
      `checklist-${equipoId}`,
      JSON.stringify(serializarRespuestas(respuestas)),
    );

    localStorage.setItem(
      `checklist-observaciones-${equipoId}`,
      otrasObservaciones,
    );
  }, [equipoId, respuestas, otrasObservaciones, cargadoStorage]);

  useEffect(() => {
    if (!equipoId || !cargadoStorage) return;

    let activo = true;

    async function cargarFotosChecklistGuardadas() {
      setCargandoFotosGuardadas(true);

      const { data, error } = await supabase
        .from("checklist_fotos")
        .select("*")
        .eq("orden_id", equipoId);

      if (!activo) return;

      if (error) {
        console.error("No se pudieron cargar las fotos guardadas del checklist:", error);
        setCargandoFotosGuardadas(false);
        return;
      }

      const agrupadas: Record<string, FotoChecklistGuardada[]> = {};

      (data || []).forEach((registro: any) => {
        const itemId = textoSeguro(registro.item_id) || OTRAS_FOTOS_CHECKLIST_ID;
        const foto = crearFotoGuardadaDesdeRegistro(registro);
        if (!foto) return;

        agrupadas[itemId] = [...(agrupadas[itemId] || []), foto];
      });

      setRespuestas((prev) => {
        const siguiente: RespuestasChecklist = { ...prev };

        Object.entries(agrupadas).forEach(([itemId, fotosGuardadas]) => {
          const actual = siguiente[itemId] ?? crearRespuestaVacia();
          const archivosLocales = (actual.fotos || []).filter(esFotoArchivo);
          const guardadasActuales = (actual.fotos || []).filter(esFotoGuardada);
          const clavesActuales = new Set(guardadasActuales.map(claveFotoGuardada));
          const nuevasGuardadas = fotosGuardadas.filter(
            (foto) => !clavesActuales.has(claveFotoGuardada(foto)),
          );

          siguiente[itemId] = {
            ...actual,
            fotos: [...guardadasActuales, ...nuevasGuardadas, ...archivosLocales],
          };
        });

        return siguiente;
      });

      setCargandoFotosGuardadas(false);
    }

    cargarFotosChecklistGuardadas();

    return () => {
      activo = false;
    };
  }, [equipoId, cargadoStorage]);

  function cambiarOtrasObservaciones(value: string) {
    setDiagnosticoGenerado(null);
    setOtrasObservaciones(value);
  }

  async function guardarTecnicoACargo(valor: string) {
    setTecnicoACargo(valor);

    if (!equipoId) return;

    localStorage.setItem(`tecnico-a-cargo-${equipoId}`, valor);

    setGuardandoTecnico(true);

    const { error } = await supabase
      .from("ordenes")
      .update({ tecnico_a_cargo: valor || null })
      .eq("id", equipoId);

    if (error) {
      console.error("No se pudo guardar el técnico a cargo:", error);
    }

    setGuardandoTecnico(false);
  }

  async function eliminarFotoGuardadaSupabase(foto: FotoChecklistGuardada) {
    try {
      if (foto.storage_path) {
        await supabase.storage.from("reportes").remove([foto.storage_path]);
      }

      let query = supabase.from("checklist_fotos").delete();

      if (foto.id) {
        query = query.eq("id", foto.id);
      } else if (foto.storage_path) {
        query = query.eq("storage_path", foto.storage_path);
      } else {
        query = query.eq("url", foto.url);
      }

      const { error } = await query;

      if (error) {
        console.error("No se pudo eliminar la foto del checklist:", error);
      }
    } catch (error) {
      console.error("Error eliminando foto del checklist:", error);
    }
  }

  function eliminarFotosGuardadasSupabase(fotos: FotoChecklist[]) {
    fotos.filter(esFotoGuardada).forEach((foto) => {
      void eliminarFotoGuardadaSupabase(foto);
    });
  }

  function cambiarEstado(itemId: string, estado: EstadoChecklist) {
    setDiagnosticoGenerado(null);

    if (estado !== "malo") {
      eliminarFotosGuardadasSupabase(respuestas[itemId]?.fotos || []);
    }

    setRespuestas((prev) => {
      const anterior = prev[itemId] ?? crearRespuestaVacia();

      return {
        ...prev,
        [itemId]: {
          ...anterior,
          estado,
          observacion: estado === "malo" ? anterior.observacion : "",
          fotos: estado === "malo" ? anterior.fotos : [],
          acciones: estado === "malo" ? anterior.acciones : [],
          repuesto_nombre: estado === "malo" ? anterior.repuesto_nombre : "",
          repuesto_cantidad:
            estado === "malo" ? anterior.repuesto_cantidad || "1" : "1",
          accion_otro: estado === "malo" ? anterior.accion_otro : "",
        },
      };
    });
  }

  function cambiarObservacion(itemId: string, observacion: string) {
    setDiagnosticoGenerado(null);

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? crearRespuestaVacia()),
        observacion,
      },
    }));
  }

  function cambiarAccion(
    itemId: string,
    accion: AccionChecklist,
    itemLabel?: string,
  ) {
    setDiagnosticoGenerado(null);

    setRespuestas((prev) => {
      const anterior = prev[itemId] ?? crearRespuestaVacia();
      const existe = anterior.acciones.includes(accion);

      const acciones = existe
        ? anterior.acciones.filter((a) => a !== accion)
        : [...anterior.acciones, accion];

      return {
        ...prev,
        [itemId]: {
          ...anterior,
          acciones,
          repuesto_nombre: acciones.includes("repuesto")
            ? anterior.repuesto_nombre ||
              obtenerRepuestoSugerido(itemLabel || "")
            : "",
          repuesto_cantidad: acciones.includes("repuesto")
            ? anterior.repuesto_cantidad || "1"
            : "1",
          accion_otro: acciones.includes("otro") ? anterior.accion_otro : "",
        },
      };
    });
  }

  function cambiarRepuestoNombre(itemId: string, value: string) {
    setDiagnosticoGenerado(null);

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? crearRespuestaVacia()),
        repuesto_nombre: value,
      },
    }));
  }

  function cambiarRepuestoCantidad(itemId: string, value: string) {
    setDiagnosticoGenerado(null);

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? crearRespuestaVacia()),
        repuesto_cantidad: value,
      },
    }));
  }

  function cambiarAccionOtro(itemId: string, value: string) {
    setDiagnosticoGenerado(null);

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? crearRespuestaVacia()),
        accion_otro: value,
      },
    }));
  }

  function agregarFotos(itemId: string, files: FileList | null) {
    if (!files) return;

    setDiagnosticoGenerado(null);

    const nuevasFotos = Array.from(files);

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? crearRespuestaVacia()),
        fotos: [...(prev[itemId]?.fotos ?? []), ...nuevasFotos],
      },
    }));
  }

  async function eliminarFoto(itemId: string, index: number) {
    setDiagnosticoGenerado(null);

    const foto = respuestas[itemId]?.fotos?.[index];

    if (foto && esFotoGuardada(foto)) {
      await eliminarFotoGuardadaSupabase(foto);
    }

    setRespuestas((prev) => ({
      ...prev,
      [itemId]: {
        ...(prev[itemId] ?? crearRespuestaVacia()),
        fotos: (prev[itemId]?.fotos ?? []).filter(
          (_, fotoIndex) => fotoIndex !== index,
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

  async function guardarChecklistTecnicoConFotos() {
    if (!equipoId || !checklist || !tipoEquipo) return respuestas;

    setGuardandoChecklist(true);

    const respuestasDb = serializarRespuestas(respuestas);
    const itemsMalosDb = itemsMalos.map((registro) => ({
      item: {
        id: registro.item.id,
        label: registro.item.label,
        sistema: registro.item.sistema || "",
        afectaSeguridad: Boolean(registro.item.afectaSeguridad),
      },
      respuesta: {
        estado: registro.respuesta.estado,
        observacion: registro.respuesta.observacion,
        acciones: registro.respuesta.acciones,
        repuesto_nombre: registro.respuesta.repuesto_nombre,
        repuesto_cantidad: registro.respuesta.repuesto_cantidad,
        accion_otro: registro.respuesta.accion_otro,
        cantidad_fotos: registro.respuesta.fotos?.length || 0,
      },
    }));

    const { error: errorChecklist } = await supabase
      .from("checklists_tecnicos")
      .upsert(
        {
          orden_id: equipoId,
          tipo_equipo: tipoEquipo,
          checklist_nombre: checklist.nombre,
          checklist_descripcion: checklist.descripcion,
          checklist_json: checklist,
          respuestas_json: respuestasDb,
          items_malos_json: itemsMalosDb,
          observaciones_generales: otrasObservaciones || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "orden_id" },
      );

    if (errorChecklist) {
      setGuardandoChecklist(false);
      throw new Error(errorChecklist.message);
    }

    const itemsPorId: Record<string, ChecklistItem | { id: string; label: string }> = {};

    checklist.sections.forEach((section) => {
      section.items.forEach((item) => {
        itemsPorId[item.id] = item;
      });
    });

    itemsPorId[OTRAS_FOTOS_CHECKLIST_ID] = {
      id: OTRAS_FOTOS_CHECKLIST_ID,
      label: "Otras fotos del checklist",
    };

    const respuestasActualizadas: RespuestasChecklist = { ...respuestas };

    for (const [itemId, respuesta] of Object.entries(respuestas)) {
      const fotos = respuesta.fotos || [];
      const guardadas = fotos.filter(esFotoGuardada);
      const archivos = fotos.filter(esFotoArchivo);
      const nuevasGuardadas: FotoChecklistGuardada[] = [];

      for (let index = 0; index < archivos.length; index += 1) {
        const foto = archivos[index];
        const nombreSeguro = limpiarNombreArchivo(foto.name || `foto-${index}.jpg`);
        const storagePath = `checklist/${equipoId}/${itemId}-${Date.now()}-${index}-${nombreSeguro}`;

        const { error: errorUpload } = await supabase.storage
          .from("reportes")
          .upload(storagePath, foto, {
            cacheControl: "3600",
            upsert: true,
          });

        if (errorUpload) {
          setGuardandoChecklist(false);
          throw new Error(errorUpload.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from("reportes")
          .getPublicUrl(storagePath);

        const fila = {
          orden_id: equipoId,
          item_id: itemId,
          item_label: itemsPorId[itemId]?.label || itemId,
          url: publicUrlData.publicUrl,
          storage_path: storagePath,
          nombre: foto.name || nombreSeguro,
          observacion: respuesta.observacion || null,
        };

        const { data: fotoInsertada, error: errorInsert } = await supabase
          .from("checklist_fotos")
          .insert(fila)
          .select("*")
          .single();

        if (errorInsert) {
          setGuardandoChecklist(false);
          throw new Error(errorInsert.message);
        }

        const fotoGuardada = crearFotoGuardadaDesdeRegistro(fotoInsertada);
        if (fotoGuardada) nuevasGuardadas.push(fotoGuardada);
      }

      respuestasActualizadas[itemId] = {
        ...respuesta,
        fotos: [...guardadas, ...nuevasGuardadas],
      };
    }

    setRespuestas(respuestasActualizadas);
    setGuardandoChecklist(false);

    return respuestasActualizadas;
  }

  async function generarDiagnostico() {
    if (!checklist || !tipoEquipo) return;

    setGenerandoIA(true);
    setUsoRespaldoLocal(false);

    const checklistCompleto = {
      totalItems,
      itemsRespondidos,
      secciones: checklist.sections.map((section) => ({
        id: section.id,
        titulo: section.titulo,
        items: section.items.map((item) => {
          const respuesta = respuestas[item.id] || crearRespuestaVacia();

          return {
            item: {
              id: item.id,
              label: item.label,
              sistema: item.sistema || "",
              afectaSeguridad: Boolean(item.afectaSeguridad),
            },
            respuesta: {
              estado: respuesta.estado,
              observacion: respuesta.observacion,
              acciones: respuesta.acciones,
              repuesto_nombre: respuesta.repuesto_nombre,
              repuesto_cantidad: respuesta.repuesto_cantidad,
              accion_otro: respuesta.accion_otro,
              cantidad_fotos: respuesta.fotos?.length || 0,
            },
          };
        }),
      })),
      tecnicoACargo: textoSeguro(tecnicoACargo),
      otrasObservaciones: textoSeguro(otrasObservaciones),
      cantidadOtrasFotos: otrasFotosChecklist.length,
      itemsMalos: itemsMalos.map((registro) => ({
        item: {
          id: registro.item.id,
          label: registro.item.label,
          descripcion: "",
          sistema: registro.item.sistema || "",
          afectaSeguridad: Boolean(registro.item.afectaSeguridad),
        },
        respuesta: {
          estado: registro.respuesta.estado,
          observacion: registro.respuesta.observacion,
          acciones: registro.respuesta.acciones,
          repuesto_nombre: registro.respuesta.repuesto_nombre,
          repuesto_cantidad: registro.respuesta.repuesto_cantidad,
          accion_otro: registro.respuesta.accion_otro,
          cantidad_fotos: registro.respuesta.fotos?.length || 0,
        },
      })),
    };

    const observacionesPorItem = itemsMalos
      .map(
        (registro) =>
          `${registro.item.label}: ${
            registro.respuesta.observacion || "Sin observación"
          }`,
      )
      .join("\n");

    const observacionesChecklist = unirLineas([
      observacionesPorItem,
      otrasObservaciones
        ? `Otras observaciones generales: ${otrasObservaciones}`
        : "",
      otrasFotosChecklist.length > 0
        ? `Otras fotos del checklist adjuntas: ${otrasFotosChecklist.length}`
        : "",
    ]);

    try {
      await guardarTecnicoACargo(tecnicoACargo);
      await guardarChecklistTecnicoConFotos();

      const response = await fetch("/api/diagnostico-ia", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ordenId: equipoId || null,
          equipoId: equipoId || null,
          equipo: {
            tipoEquipo,
            tipo: tipoEquipo,
            nombreChecklist: checklist.nombre,
            descripcionChecklist: checklist.descripcion,
          },
          checklist: checklistCompleto,
          problemaReportado: "",
          tecnicoACargo,
          tecnico_a_cargo: tecnicoACargo,
          observacionesIngreso: observacionesChecklist,
          observaciones: observacionesChecklist,
        }),
      });

      if (!response.ok) {
        throw new Error("La IA no respondió correctamente");
      }

      const data = (await response.json()) as RespuestaDiagnosticoIA;

      console.log("RESPUESTA IA:", data);

      const diagnosticoIA = incorporarObservacionesGenerales(
        crearDiagnosticoDesdeRespuestaIA(
          data,
          tipoEquipo,
          checklist,
          itemsMalos,
        ),
        otrasObservaciones,
      );

      setDiagnosticoGenerado(diagnosticoIA);

      if (equipoId) {
        localStorage.setItem(
          `checklist-${equipoId}`,
          JSON.stringify(serializarRespuestas(respuestas)),
        );
      }

      onGenerarDiagnostico?.({
        equipoId,
        tipoEquipo,
        checklist,
        respuestas,
        itemsMalos,
        diagnostico: diagnosticoIA,
        observacionesGenerales: otrasObservaciones,
        diagnosticoIASenior: data.diagnostico || null,
        fuenteIA: data.fuente || "openai",
        tecnicoACargo,
      });
    } catch (error) {
      console.error("Error IA, usando respaldo local:", error);

      const diagnosticoLocal = incorporarObservacionesGenerales(
        crearDiagnosticoVisibleTecnicoDesdeChecklist(
          tipoEquipo,
          checklist,
          itemsMalos,
          null,
        ),
        otrasObservaciones,
      );

      setUsoRespaldoLocal(true);
      setDiagnosticoGenerado(diagnosticoLocal);

      if (equipoId) {
        localStorage.setItem(
          `checklist-${equipoId}`,
          JSON.stringify(serializarRespuestas(respuestas)),
        );
      }

      onGenerarDiagnostico?.({
        equipoId,
        tipoEquipo,
        checklist,
        respuestas,
        itemsMalos,
        diagnostico: diagnosticoLocal,
        observacionesGenerales: otrasObservaciones,
        tecnicoACargo,
      });
    } finally {
      setGenerandoIA(false);
    }
  }

  if (!tipoEquipo || !checklist) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-xl font-bold text-amber-900">
          Checklist no disponible
        </h2>

        <p className="mt-2 text-sm text-amber-800">
          Esta orden no tiene un tipo de equipo compatible con el checklist
          inteligente. Revisa el campo Tipo de equipo en Detalle.
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
          <h2 className="text-xl font-bold text-slate-900">
            Checklist Inteligente
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Checklist cargado automáticamente según el tipo de equipo ingresado.
          </p>
        </div>

        <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          Avance {porcentajeAvance}%
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-bold text-slate-700">
          Técnico a cargo
        </label>

        <select
          value={tecnicoACargo}
          onChange={(event) => guardarTecnicoACargo(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Seleccionar técnico</option>
          {TECNICOS_MJ.map((tecnico) => (
            <option key={tecnico} value={tecnico}>
              {tecnico}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs font-semibold text-slate-500">
          {guardandoTecnico
            ? "Guardando técnico..."
            : cargandoFotosGuardadas
            ? "Cargando fotos guardadas del checklist..."
            : tecnicoACargo
            ? "Este técnico quedará asociado al checklist, diagnóstico e informe."
            : "Selecciona el técnico responsable antes de generar el diagnóstico."}
        </p>
      </div>

      <div className="mb-5 rounded-xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-500">Tipo de equipo</p>
        <p className="mt-1 text-lg font-bold text-slate-900">
          {checklist.nombre}
        </p>
        <p className="mt-1 text-sm text-slate-500">{checklist.descripcion}</p>

        <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs font-semibold">
          <div className="rounded-lg bg-white p-3 text-slate-600">
            Total
            <div className="mt-1 text-lg text-slate-900">{totalItems}</div>
          </div>

          <div className="rounded-lg bg-white p-3 text-slate-600">
            Respondidos
            <div className="mt-1 text-lg text-slate-900">
              {itemsRespondidos}
            </div>
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
            <div
              key={section.id}
              className="rounded-xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => toggleSeccion(section.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="font-bold text-slate-900">{section.titulo}</p>

                  {section.descripcion && (
                    <p className="mt-1 text-sm text-slate-500">
                      {section.descripcion}
                    </p>
                  )}
                </div>

                <span className="text-sm font-bold text-blue-600">
                  {abierta ? "Cerrar" : "Abrir"}
                </span>
              </button>

              {abierta && (
                <div className="space-y-3 border-t border-slate-200 p-4">
                  {section.items.map((item) => {
                    const respuesta =
                      respuestas[item.id] ?? crearRespuestaVacia();

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 bg-white p-4"
                      >
                        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {item.label}
                            </p>

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
                          <div className="mt-4 space-y-4 rounded-xl bg-red-50 p-4">
                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Observación
                              </label>

                              <textarea
                                value={respuesta.observacion}
                                onChange={(event) =>
                                  cambiarObservacion(
                                    item.id,
                                    event.target.value,
                                  )
                                }
                                placeholder="Describe brevemente la falla encontrada..."
                                className="min-h-[90px] w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Acción requerida
                              </label>

                              <div className="grid gap-2 md:grid-cols-2">
                                {ACCIONES.map((accion) => {
                                  const seleccionada =
                                    respuesta.acciones.includes(accion.value);

                                  return (
                                    <button
                                      key={accion.value}
                                      type="button"
                                      onClick={() =>
                                        cambiarAccion(
                                          item.id,
                                          accion.value,
                                          item.label,
                                        )
                                      }
                                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                                        seleccionada
                                          ? "border-blue-500 bg-blue-50 text-blue-700"
                                          : "border-red-200 bg-white text-slate-600"
                                      }`}
                                    >
                                      {seleccionada ? "✓ " : ""}
                                      {accion.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {respuesta.acciones.includes("repuesto") && (
                              <div className="grid gap-3 md:grid-cols-3">
                                <div className="md:col-span-2">
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Repuesto requerido
                                  </label>

                                  <input
                                    value={respuesta.repuesto_nombre}
                                    onChange={(event) =>
                                      cambiarRepuestoNombre(
                                        item.id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Ej: Gancho inferior, cadena, pestillo..."
                                    className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Cantidad
                                  </label>

                                  <input
                                    value={respuesta.repuesto_cantidad}
                                    onChange={(event) =>
                                      cambiarRepuestoCantidad(
                                        item.id,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="1"
                                    className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                  />
                                </div>
                              </div>
                            )}

                            {respuesta.acciones.includes("otro") && (
                              <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                  Especificar otra acción
                                </label>

                                <input
                                  value={respuesta.accion_otro}
                                  onChange={(event) =>
                                    cambiarAccionOtro(
                                      item.id,
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Ej: enviar a proveedor, evaluar con jefatura..."
                                  className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                                />
                              </div>
                            )}

                            <div>
                              <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Fotos
                              </label>

                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(event) =>
                                  agregarFotos(item.id, event.target.files)
                                }
                                className="w-full rounded-xl border border-red-200 bg-white px-3 py-2 text-sm"
                              />

                              {respuesta.fotos.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {respuesta.fotos.map((foto, index) => (
                                    <div
                                      key={`${nombreFotoChecklist(foto)}-${index}`}
                                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                      <span className="truncate text-slate-700">
                                        {nombreFotoChecklist(foto)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          eliminarFoto(item.id, index)
                                        }
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

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-bold text-slate-900">
          Otras observaciones generales
        </label>

        <p className="mb-3 text-sm text-slate-500">
          Usa este campo para registrar información adicional que no esté en el
          checklist. También será enviada a la IA y quedará asociada al
          diagnóstico.
        </p>

        <textarea
          value={otrasObservaciones}
          onChange={(event) => cambiarOtrasObservaciones(event.target.value)}
          placeholder="Ej: equipo llega con golpes visibles no asociados a un ítem específico, cliente informa ruido intermitente, faltan accesorios, condiciones especiales de operación, etc."
          className="min-h-[110px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <label className="mb-2 block text-sm font-bold text-slate-900">
            Otras fotos del checklist
          </label>

          <p className="mb-3 text-sm text-slate-500">
            Adjunta fotos generales que no correspondan a un componente específico.
            También quedarán guardadas para el informe técnico y el reporte final.
          </p>

          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) =>
              agregarFotos(OTRAS_FOTOS_CHECKLIST_ID, event.target.files)
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />

          {otrasFotosChecklist.length > 0 && (
            <div className="mt-3 space-y-2">
              {otrasFotosChecklist.map((foto, index) => (
                <div
                  key={`${nombreFotoChecklist(foto)}-${index}`}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="truncate text-slate-700">{nombreFotoChecklist(foto)}</span>

                  <button
                    type="button"
                    onClick={() => eliminarFoto(OTRAS_FOTOS_CHECKLIST_ID, index)}
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

      <div className="mt-6 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-bold text-slate-900">Generar diagnóstico</p>

          <p className="mt-1 text-sm text-slate-500">
            El sistema intentará generar el diagnóstico con IA. Si falla, usará
            el Motor MJ como respaldo.
          </p>
        </div>

        <button
          type="button"
          onClick={generarDiagnostico}
          disabled={itemsRespondidos === 0 || generandoIA || guardandoChecklist}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {guardandoChecklist
            ? "Guardando checklist..."
            : generandoIA
            ? "Generando con IA..."
            : "Guardar equipo y generar diagnóstico"}
        </button>
      </div>

      {diagnosticoGenerado && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <p className="font-bold">
            {usoRespaldoLocal
              ? "Diagnóstico generado por Motor MJ (respaldo local)"
              : "Diagnóstico generado con IA"}
          </p>
          <p className="mt-2 whitespace-pre-wrap">
            {diagnosticoGenerado.resumen}
          </p>
        </div>
      )}
    </div>
  );
}
