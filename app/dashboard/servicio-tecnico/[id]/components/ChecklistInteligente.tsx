"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CHECKLISTS,
  ChecklistEquipo,
  ChecklistItem,
  EstadoChecklist,
  TipoEquipoChecklist,
  getChecklistByTipo,
} from "../lib/checklists";
import {
  DiagnosticoGeneradoMJ,
  generarDiagnosticoMJ,
} from "../lib/diagnosticoEngine";
import { obtenerRepuestoSugerido } from "../lib/repuestosSugeridos";

type AccionChecklist =
  "repuesto" | "reparacion" | "ajuste" | "mantencion" | "otro";

type RespuestaChecklist = {
  estado: EstadoChecklist | "";
  observacion: string;
  fotos: File[];
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

function unirLineas(lineas: Array<string | null | undefined>): string {
  return lineas.map(textoSeguro).filter(Boolean).join("\n");
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
  const resumen = diagnostico.resumenEjecutivo;
  const procedimiento = formatearProcedimientoSenior(diagnostico);
  const repuestos = formatearRepuestosSenior(diagnostico);

  const resumenTexto = unirLineas([
    resumen?.equipoLlegado ? `Equipo: ${resumen.equipoLlegado}` : "",
    resumen?.estadoGeneral ? `Estado general: ${resumen.estadoGeneral}` : "",
    resumen?.nivelRiesgo ? `Nivel de riesgo: ${resumen.nivelRiesgo}` : "",
    resumen?.conclusion ? `Conclusión: ${resumen.conclusion}` : "",
    diagnostico.riesgo?.clasificacion
      ? `Clasificación: ${diagnostico.riesgo.clasificacion}`
      : "",
    diagnostico.riesgo?.justificacion
      ? `Justificación riesgo: ${diagnostico.riesgo.justificacion}`
      : "",
    diagnostico.horasEstimadas
      ? `Horas estimadas IA: ${
          diagnostico.horasEstimadas.minimo ?? "-"
        } a ${diagnostico.horasEstimadas.maximo ?? "-"} h`
      : "",
    diagnostico.observacionesCliente
      ? `Observación cliente: ${diagnostico.observacionesCliente}`
      : "",
  ]);

  const causasTexto = formatearCausasSenior(diagnostico);

  const diagnosticoTecnico = unirLineas([
    "Hallazgos técnicos:",
    formatearHallazgosSenior(diagnostico),
    causasTexto ? "\nCausa probable:" : "",
    causasTexto,
    diagnostico.riesgo?.clasificacion ? "\nRiesgo:" : "",
    diagnostico.riesgo?.clasificacion
      ? `${diagnostico.riesgo.clasificacion}. ${
          diagnostico.riesgo.justificacion || ""
        }`
      : "",
    diagnostico.advertencias?.length ? "\nAdvertencias:" : "",
    diagnostico.advertencias?.length
      ? diagnostico.advertencias.map((item) => `- ${item}`).join("\n")
      : "",
  ]);

  return {
    tipoEquipo,
    nombreEquipo: checklist.nombre,
    resumen: resumenTexto || diagnostico.observacionesCliente || diagnosticoTecnico,
    diagnosticoTecnico,
    procedimientoRecomendado: procedimiento as any,
    repuestosSugeridos: repuestos as any,
    criticidad: criticidadDesdeDiagnosticoSenior(diagnostico),
    requiereRetiroServicio: requiereRetiroDesdeDiagnosticoSenior(diagnostico),
    itemsMalos: itemsMalosActuales as any,
  };
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
  }) => void;
};

const ACCIONES: Array<{ value: AccionChecklist; label: string }> = [
  { value: "repuesto", label: "Repuesto" },
  { value: "reparacion", label: "Reparación" },
  { value: "ajuste", label: "Ajuste" },
  { value: "mantencion", label: "Mantención" },
  { value: "otro", label: "Otro" },
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

  useEffect(() => {
    onProgreso?.(porcentajeAvance);
  }, [porcentajeAvance, onProgreso]);

  useEffect(() => {
    const base = crearRespuestasVacias(
      tipoEquipo ? CHECKLISTS[tipoEquipo] : null,
    );

    if (!equipoId) {
      setRespuestas(base);
      setCargadoStorage(true);
      return;
    }

    try {
      const guardado = localStorage.getItem(`checklist-${equipoId}`);

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
  }, [equipoId, respuestas, cargadoStorage]);

  function cambiarEstado(itemId: string, estado: EstadoChecklist) {
    setDiagnosticoGenerado(null);

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

  function eliminarFoto(itemId: string, index: number) {
    setDiagnosticoGenerado(null);

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

    const observacionesChecklist = itemsMalos
      .map(
        (registro) =>
          `${registro.item.label}: ${
            registro.respuesta.observacion || "Sin observación"
          }`,
      )
      .join("\n");

    try {
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
          observacionesIngreso: observacionesChecklist,
          observaciones: observacionesChecklist,
        }),
      });

      if (!response.ok) {
        throw new Error("La IA no respondió correctamente");
      }

      const data = (await response.json()) as RespuestaDiagnosticoIA;

      console.log("RESPUESTA IA:", data);

      const diagnosticoIA = crearDiagnosticoDesdeRespuestaIA(
        data,
        tipoEquipo,
        checklist,
        itemsMalos,
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
      });
    } catch (error) {
      console.error("Error IA, usando respaldo local:", error);

      const diagnosticoLocal = generarDiagnosticoMJ({
        tipoEquipo,
        checklist,
        respuestas,
      });

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
                                      key={`${foto.name}-${index}`}
                                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                    >
                                      <span className="truncate text-slate-700">
                                        {foto.name}
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
          disabled={itemsRespondidos === 0 || generandoIA}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {generandoIA
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
