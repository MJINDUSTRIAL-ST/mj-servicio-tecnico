"use client";

import { useEffect, useState } from "react";
import { descargarInformeEjecutivoMJ } from "../lib/informeEjecutivoMJHTML";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId: string;
  onEstadoActualizado?: (estado: string) => void;
};

type EquipoRevision = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  diagnostico_ia_json?: DiagnosticoIA | string | null;
  diagnostico_ia_fuente?: string | null;
  diagnostico_ia_generado_en?: string | null;
};

type NivelRiesgo = "bajo" | "medio" | "alto" | "critico";

type DiagnosticoIA = {
  resumenEjecutivo?: {
    equipoLlegado?: string;
    estadoGeneral?: string;
    nivelRiesgo?: NivelRiesgo | string;
    conclusion?: string;
  };
  hallazgosTecnicos?: {
    categoria?: string;
    estado?: string;
    detalle?: string;
    evidenciaChecklist?: string[];
    severidad?: string;
  }[];
  causaProbable?: {
    causa?: string;
    justificacion?: string;
    confianza?: string;
  }[];
  riesgo?: {
    clasificacion?: "Apto" | "Apto con observaciones" | "No Apto" | string;
    justificacion?: string;
  };
  procedimientoRecomendado?: {
    paso?: number;
    trabajo?: string;
    prioridad?: string;
    requiereRepuesto?: boolean;
    observacion?: string;
  }[];
  repuestosSugeridos?: {
    cantidad?: number;
    nombre?: string;
    prioridad?: string;
    motivo?: string;
  }[];
  horasEstimadas?: {
    minimo?: number;
    maximo?: number;
    detalle?: string;
    supuesto?: string;
  };
  observacionesCliente?: string;
  confianzaDiagnostico?: string;
  conocimientoUtilizado?: {
    casoId?: string;
    similitud?: number;
    aprendizaje?: string;
  }[];
  advertencias?: string[];
};

type RevisionPorEquipo = {
  idRevision: string | null;
  estado: "Aprobado" | "Rechazado" | "";
  motivo: string;
  horas: string;
  procedimiento: string;
  repuestos: string;
  guardando: boolean;
  guardadoOk: boolean;
  diagnosticoIA: DiagnosticoIA | null;
  diagnosticoIAFuente: string;
  diagnosticoIAGeneradoEn: string;
};

type CampoEditableRevision = "motivo" | "horas" | "procedimiento" | "repuestos";

function identificadorEquipo(equipo: EquipoRevision) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function revisionVacia(): RevisionPorEquipo {
  return {
    idRevision: null,
    estado: "",
    motivo: "",
    horas: "",
    procedimiento: "",
    repuestos: "",
    guardando: false,
    guardadoOk: false,
    diagnosticoIA: null,
    diagnosticoIAFuente: "",
    diagnosticoIAGeneradoEn: "",
  };
}

function textoSeguro(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function numeroSeguro(valor: unknown) {
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function normalizarDiagnosticoIA(valor: unknown): DiagnosticoIA | null {
  if (!valor) return null;

  if (typeof valor === "string") {
    try {
      return JSON.parse(valor) as DiagnosticoIA;
    } catch {
      return null;
    }
  }

  if (typeof valor === "object") {
    return valor as DiagnosticoIA;
  }

  return null;
}

function textoAccion(accion: string) {
  if (accion === "repuesto") return "Repuesto";
  if (accion === "reparacion") return "Reparación";
  if (accion === "ajuste") return "Ajuste";
  if (accion === "mantencion") return "Mantención";
  if (accion === "otro") return "Otro";
  return accion;
}

function generarDesdeChecklist(equipoId: string) {
  const trabajo = obtenerEquipoTrabajo(equipoId);
  const checklist = trabajo.checklist;

  if (!checklist?.itemsMalos?.length) {
    return {
      procedimiento: trabajo.diagnostico?.procedimiento || "",
      repuestos: trabajo.diagnostico?.repuestos || "",
    };
  }

  const repuestos: string[] = [];
  const acciones: string[] = [];

  checklist.itemsMalos.forEach((registro: any) => {
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
      } else if (accion === "otro") {
        acciones.push(`${respuesta.accion_otro || "Otro"} - ${nombreItem}`);
      } else {
        acciones.push(`${textoAccion(accion)} - ${nombreItem}`);
      }
    });
  });

  const procedimientoPartes: string[] = [];

  if (acciones.length > 0) {
    procedimientoPartes.push(`Acciones sugeridas:\n${acciones.join("\n")}`);
  }

  if (repuestos.length > 0) {
    procedimientoPartes.push(`Repuestos sugeridos:\n${repuestos.join("\n")}`);
  }

  const procedimiento =
    procedimientoPartes.length > 0
      ? `Se recomienda ejecutar las siguientes acciones antes de liberar el equipo:\n\n${procedimientoPartes.join(
          "\n\n"
        )}`
      : trabajo.diagnostico?.procedimiento || "";

  return {
    procedimiento,
    repuestos: repuestos.join("\n"),
  };
}

function formatearProcedimientoDesdeIA(diagnosticoIA: DiagnosticoIA | null) {
  const procedimiento = diagnosticoIA?.procedimientoRecomendado || [];

  if (!procedimiento.length) return "";

  return procedimiento
    .map((item, index) => {
      const paso = item.paso || index + 1;
      const trabajo = textoSeguro(item.trabajo) || "Trabajo recomendado";
      const prioridad = textoSeguro(item.prioridad);
      const observacion = textoSeguro(item.observacion);
      const requiereRepuesto = item.requiereRepuesto
        ? "Requiere repuesto"
        : "No requiere repuesto";

      return [
        `${paso}. ${trabajo}`,
        prioridad ? `Prioridad: ${prioridad}` : "",
        requiereRepuesto,
        observacion ? `Observación: ${observacion}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function formatearRepuestosDesdeIA(diagnosticoIA: DiagnosticoIA | null) {
  const repuestos = diagnosticoIA?.repuestosSugeridos || [];

  if (!repuestos.length) return "";

  return repuestos
    .map((item) => {
      const cantidad = item.cantidad || 1;
      const nombre = textoSeguro(item.nombre) || "Repuesto sugerido";
      const prioridad = textoSeguro(item.prioridad);
      const motivo = textoSeguro(item.motivo);

      return [
        `${cantidad} x ${nombre}`,
        prioridad ? `Prioridad: ${prioridad}` : "",
        motivo ? `Motivo: ${motivo}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

function formatearHorasDesdeIA(diagnosticoIA: DiagnosticoIA | null) {
  const minimo = numeroSeguro(diagnosticoIA?.horasEstimadas?.minimo);
  const maximo = numeroSeguro(diagnosticoIA?.horasEstimadas?.maximo);

  if (minimo === null && maximo === null) return "";

  if (minimo !== null && maximo !== null) {
    const promedio = (minimo + maximo) / 2;
    return promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1);
  }

  if (maximo !== null) return String(maximo);
  if (minimo !== null) return String(minimo);

  return "";
}

function formatearHallazgosDesdeIA(diagnosticoIA: DiagnosticoIA | null) {
  const hallazgos = diagnosticoIA?.hallazgosTecnicos || [];

  if (!hallazgos.length) return "";

  return hallazgos
    .map((hallazgo) => {
      const categoria = textoSeguro(hallazgo.categoria) || "General";
      const estado = textoSeguro(hallazgo.estado);
      const severidad = textoSeguro(hallazgo.severidad);
      const detalle = textoSeguro(hallazgo.detalle);

      return [
        `${categoria}`,
        estado ? `Estado: ${estado}` : "",
        severidad ? `Severidad: ${severidad}` : "",
        detalle ? `Detalle: ${detalle}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function formatearTrabajosParaPDF(procedimiento: string, repuestos: string) {
  const trabajos = procedimiento
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  const repuestosLista = repuestos
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `Repuesto: ${item}`);

  return [...trabajos, ...repuestosLista];
}

function claseRiesgo(nivel?: string) {
  const valor = textoSeguro(nivel).toLowerCase();

  if (valor === "critico" || valor === "crítico" || valor === "alto") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (valor === "medio") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-green-200 bg-green-50 text-green-800";
}

function claseClasificacion(clasificacion?: string) {
  const valor = textoSeguro(clasificacion).toLowerCase();

  if (valor === "no apto") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (valor === "apto con observaciones") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-green-200 bg-green-50 text-green-800";
}

function construirDiagnosticoAprobadoJson(
  actual: RevisionPorEquipo,
  estadoFinal: "Aprobado" | "Rechazado"
) {
  return {
    version: "revision-jefe-mj-v1",
    aprobado: estadoFinal === "Aprobado",
    fecha_revision: new Date().toISOString(),
    observaciones_jefe: actual.motivo,
    horas_hombre_aprobadas: actual.horas ? Number(actual.horas) : null,
    procedimiento_aprobado: actual.procedimiento,
    repuestos_aprobados: actual.repuestos,
    diagnostico_ia_original: actual.diagnosticoIA,
    resumen_ejecutivo_aprobado: actual.diagnosticoIA?.resumenEjecutivo || null,
    hallazgos_tecnicos_aprobados:
      actual.diagnosticoIA?.hallazgosTecnicos || [],
    causa_probable_aprobada: actual.diagnosticoIA?.causaProbable || [],
    riesgo_aprobado: actual.diagnosticoIA?.riesgo || null,
    observaciones_cliente_aprobadas:
      actual.diagnosticoIA?.observacionesCliente || "",
  };
}

export default function RevisionJefe({
  ordenId,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<EquipoRevision[]>([]);
  const [revisiones, setRevisiones] = useState<
    Record<string, RevisionPorEquipo>
  >({});

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    const { data: hijos } = await supabase
      .from("ordenes")
      .select(
        "id,codigo,equipo,marca,modelo,numero_serie,diagnostico_ia_json,diagnostico_ia_fuente,diagnostico_ia_generado_en"
      )
      .eq("orden_padre_id", ordenId)
      .order("codigo", { ascending: true });

    let equiposBase: EquipoRevision[] = hijos || [];

    if (!equiposBase.length) {
      const { data: orden } = await supabase
        .from("ordenes")
        .select(
          "id,codigo,equipo,marca,modelo,numero_serie,diagnostico_ia_json,diagnostico_ia_fuente,diagnostico_ia_generado_en"
        )
        .eq("id", ordenId)
        .single();

      if (orden) equiposBase = [orden];
    }

    setEquipos(equiposBase);

    const nuevoEstado: Record<string, RevisionPorEquipo> = {};

    for (const equipo of equiposBase) {
      const { data } = await supabase
        .from("revisiones_jefe")
        .select("*")
        .eq("orden_id", equipo.id)
        .maybeSingle();

      const base = generarDesdeChecklist(equipo.id);
      const diagnosticoIA = normalizarDiagnosticoIA(
        equipo.diagnostico_ia_json
      );

      const procedimientoIA = formatearProcedimientoDesdeIA(diagnosticoIA);
      const repuestosIA = formatearRepuestosDesdeIA(diagnosticoIA);
      const horasIA = formatearHorasDesdeIA(diagnosticoIA);

      nuevoEstado[equipo.id] = {
        idRevision: data?.id || null,
        estado:
          data?.aprobado === true
            ? "Aprobado"
            : data?.aprobado === false
            ? "Rechazado"
            : "",
        motivo: data?.motivo || "",
        horas: data?.horas_hombre?.toString() || horasIA,
        procedimiento:
          data?.procedimiento_aprobado || procedimientoIA || base.procedimiento,
        repuestos: data?.repuestos_aprobados || repuestosIA || base.repuestos,
        guardando: false,
        guardadoOk: false,
        diagnosticoIA,
        diagnosticoIAFuente: equipo.diagnostico_ia_fuente || "",
        diagnosticoIAGeneradoEn: equipo.diagnostico_ia_generado_en || "",
      };
    }

    setRevisiones(nuevoEstado);
  }

  function actualizarCampo(
    equipoId: string,
    campo: CampoEditableRevision,
    valor: string
  ) {
    setRevisiones((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || revisionVacia()),
        [campo]: valor,
      },
    }));
  }

  async function guardar(
    equipoId: string,
    estadoFinal: "Aprobado" | "Rechazado"
  ) {
    const actual = revisiones[equipoId] || revisionVacia();

    if (estadoFinal === "Rechazado" && !actual.motivo.trim()) {
      alert("Debes indicar el motivo del rechazo.");
      return;
    }

    const revisionActualizada: RevisionPorEquipo = {
      ...actual,
      estado: estadoFinal,
      guardando: true,
      guardadoOk: false,
    };

    setRevisiones((prev) => ({
      ...prev,
      [equipoId]: revisionActualizada,
    }));

    try {
      const diagnosticoAprobadoJson = construirDiagnosticoAprobadoJson(
        actual,
        estadoFinal
      );

      const datos = {
        orden_id: equipoId,
        aprobado: estadoFinal === "Aprobado",
        motivo: actual.motivo,
        horas_hombre: actual.horas ? Number(actual.horas) : null,
        procedimiento_aprobado: actual.procedimiento,
        repuestos_aprobados: actual.repuestos,
        diagnostico_ia_json: actual.diagnosticoIA,
        diagnostico_aprobado_json: diagnosticoAprobadoJson,
        updated_at: new Date().toISOString(),
      };

      guardarEquipoTrabajo(equipoId, {
        revision: {
          aprobado: estadoFinal === "Aprobado",
          motivo: actual.motivo,
          horas_hombre: actual.horas ? Number(actual.horas) : null,
          procedimiento_aprobado: actual.procedimiento,
          repuestos_aprobados: actual.repuestos,
        },
      });

      let idRevisionFinal = actual.idRevision;

      if (actual.idRevision) {
        const { error } = await supabase
          .from("revisiones_jefe")
          .update(datos)
          .eq("id", actual.idRevision);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("revisiones_jefe")
          .insert(datos)
          .select()
          .single();

        if (error) throw error;

        idRevisionFinal = data.id;
      }

      const nuevoEstadoEquipo =
        estadoFinal === "Aprobado" ? "cotizacion" : "diagnostico";

      await supabase
        .from("ordenes")
        .update({ estado: nuevoEstadoEquipo })
        .eq("id", equipoId);

      if (estadoFinal === "Rechazado") {
        await supabase
          .from("ordenes")
          .update({ estado: "diagnostico" })
          .eq("id", ordenId);

        onEstadoActualizado?.("diagnostico");
      }

      const todosAprobados = equipos.every((equipo) => {
        if (equipo.id === equipoId) return estadoFinal === "Aprobado";

        const revision = revisiones[equipo.id];
        return revision?.estado === "Aprobado";
      });

      if (todosAprobados) {
        await supabase
          .from("ordenes")
          .update({ estado: "cotizacion" })
          .eq("id", ordenId);

        onEstadoActualizado?.("cotizacion");
      }

      setRevisiones((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || revisionVacia()),
          idRevision: idRevisionFinal,
          estado: estadoFinal,
          guardando: false,
          guardadoOk: true,
        },
      }));

      setTimeout(() => {
        setRevisiones((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || revisionVacia()),
            guardadoOk: false,
          },
        }));
      }, 2500);
    } catch (e: any) {
      alert(e.message || "No se pudo guardar la revisión");

      setRevisiones((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || revisionVacia()),
          guardando: false,
        },
      }));
    }
  }

  return (
    <section className="space-y-5">
      {equipos.map((equipo, index) => {
        const actual = revisiones[equipo.id] || revisionVacia();
        const diagnosticoIA = actual.diagnosticoIA;
        const resumen = diagnosticoIA?.resumenEjecutivo;
        const riesgo = diagnosticoIA?.riesgo;
        const hallazgos = diagnosticoIA?.hallazgosTecnicos || [];
        const causas = diagnosticoIA?.causaProbable || [];
        const repuestos = diagnosticoIA?.repuestosSugeridos || [];
        const procedimiento = diagnosticoIA?.procedimientoRecomendado || [];
        const advertencias = diagnosticoIA?.advertencias || [];
        const conocimiento = diagnosticoIA?.conocimientoUtilizado || [];

        return (
          <div
            key={equipo.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Equipo {index + 1}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {equipo.equipo || "Sin tipo"}
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {identificadorEquipo(equipo)}
                </p>

                {(equipo.marca || equipo.modelo) && (
                  <p className="mt-1 text-xs text-slate-400">
                    {[equipo.marca, equipo.modelo].filter(Boolean).join(" · ")}
                  </p>
                )}

                {actual.estado === "Aprobado" && (
                  <p className="mt-2 text-xs font-bold text-green-700">
                    Revisión aprobada
                  </p>
                )}

                {actual.estado === "Rechazado" && (
                  <p className="mt-2 text-xs font-bold text-red-700">
                    Revisión rechazada
                  </p>
                )}
              </div>

              {diagnosticoIA && (
                <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                  <p className="font-bold">Diagnóstico IA cargado</p>
                  <p className="mt-1">
                    Fuente: {actual.diagnosticoIAFuente || "OpenAI"}
                  </p>
                  {actual.diagnosticoIAGeneradoEn && (
                    <p>
                      Generado:{" "}
                      {new Date(
                        actual.diagnosticoIAGeneradoEn
                      ).toLocaleString("es-CL")}
                    </p>
                  )}
                </div>
              )}
            </div>

            {!diagnosticoIA && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-bold">No hay diagnóstico IA cargado.</p>
                <p className="mt-1">
                  Puedes revisar con la información del checklist, pero lo ideal
                  es generar primero el diagnóstico IA.
                </p>
              </div>
            )}

            {diagnosticoIA && (
              <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Diagnóstico IA para revisión
                    </p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">
                      {resumen?.equipoLlegado || "Equipo revisado"}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${claseRiesgo(
                        resumen?.nivelRiesgo
                      )}`}
                    >
                      Riesgo: {resumen?.nivelRiesgo || "No indicado"}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${claseClasificacion(
                        riesgo?.clasificacion
                      )}`}
                    >
                      {riesgo?.clasificacion || "Sin clasificación"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Estado general
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {resumen?.estadoGeneral || "Sin estado general informado."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Conclusión
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {resumen?.conclusion || "Sin conclusión informada."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm font-bold text-slate-800">
                    Hallazgos técnicos
                  </p>

                  {hallazgos.length ? (
                    <div className="mt-3 space-y-3">
                      {hallazgos.map((hallazgo, hallazgoIndex) => (
                        <div
                          key={`${hallazgo.categoria}-${hallazgoIndex}`}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                              {hallazgo.categoria || "General"}
                            </span>

                            {hallazgo.estado && (
                              <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                {hallazgo.estado}
                              </span>
                            )}

                            {hallazgo.severidad && (
                              <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                                Severidad: {hallazgo.severidad}
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-slate-600">
                            {hallazgo.detalle || "Sin detalle."}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      No se registraron hallazgos técnicos.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Causa probable
                    </p>

                    {causas.length ? (
                      <div className="mt-3 space-y-3">
                        {causas.map((causa, causaIndex) => (
                          <div key={`${causa.causa}-${causaIndex}`}>
                            <p className="text-sm font-semibold text-slate-700">
                              {causa.causa || "Causa probable"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {causa.justificacion || "Sin justificación."}
                            </p>
                            {causa.confianza && (
                              <p className="mt-1 text-xs font-bold text-slate-400">
                                Confianza: {causa.confianza}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Sin causa probable informada.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Riesgo técnico
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {riesgo?.clasificacion || "Sin clasificación"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {riesgo?.justificacion || "Sin justificación."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm font-bold text-slate-800">
                    Procedimiento recomendado por IA
                  </p>

                  {procedimiento.length ? (
                    <div className="mt-3 space-y-3">
                      {procedimiento.map((item, procedimientoIndex) => (
                        <div
                          key={`${item.trabajo}-${procedimientoIndex}`}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <p className="text-sm font-bold text-slate-700">
                            {item.paso || procedimientoIndex + 1}.{" "}
                            {item.trabajo || "Trabajo recomendado"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Prioridad: {item.prioridad || "No indicada"} ·{" "}
                            {item.requiereRepuesto
                              ? "Requiere repuesto"
                              : "No requiere repuesto"}
                          </p>
                          {item.observacion && (
                            <p className="mt-2 text-sm text-slate-500">
                              {item.observacion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">
                      Sin procedimiento recomendado.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Repuestos sugeridos por IA
                    </p>

                    {repuestos.length ? (
                      <div className="mt-3 space-y-3">
                        {repuestos.map((repuesto, repuestoIndex) => (
                          <div
                            key={`${repuesto.nombre}-${repuestoIndex}`}
                            className="rounded-lg border border-slate-200 p-3"
                          >
                            <p className="text-sm font-bold text-slate-700">
                              {repuesto.cantidad || 1} x{" "}
                              {repuesto.nombre || "Repuesto"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              Prioridad: {repuesto.prioridad || "No indicada"}
                            </p>
                            {repuesto.motivo && (
                              <p className="mt-2 text-sm text-slate-500">
                                {repuesto.motivo}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Sin repuestos sugeridos.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Horas estimadas IA
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Mínimo: {diagnosticoIA.horasEstimadas?.minimo ?? "-"} h ·
                      Máximo: {diagnosticoIA.horasEstimadas?.maximo ?? "-"} h
                    </p>
                    {diagnosticoIA.horasEstimadas?.detalle && (
                      <p className="mt-2 text-sm text-slate-500">
                        {diagnosticoIA.horasEstimadas.detalle}
                      </p>
                    )}
                    {diagnosticoIA.horasEstimadas?.supuesto && (
                      <p className="mt-2 text-xs text-slate-400">
                        Supuesto: {diagnosticoIA.horasEstimadas.supuesto}
                      </p>
                    )}
                  </div>
                </div>

                {diagnosticoIA.observacionesCliente && (
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Observación sugerida para cliente
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {diagnosticoIA.observacionesCliente}
                    </p>
                  </div>
                )}

                {conocimiento.length > 0 && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                    <p className="text-sm font-bold text-indigo-900">
                      Conocimiento histórico utilizado
                    </p>

                    <div className="mt-3 space-y-2">
                      {conocimiento.map((caso, casoIndex) => (
                        <div
                          key={`${caso.casoId}-${casoIndex}`}
                          className="rounded-lg bg-white p-3 text-sm text-indigo-900"
                        >
                          <p className="font-bold">
                            Caso similar: {caso.casoId || "Sin ID"}
                          </p>
                          <p className="mt-1">
                            Similitud:{" "}
                            {typeof caso.similitud === "number"
                              ? `${Math.round(caso.similitud * 100)}%`
                              : "-"}
                          </p>
                          <p className="mt-1">{caso.aprendizaje}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {advertencias.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-bold text-amber-900">
                      Advertencias IA
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-800">
                      {advertencias.map((advertencia, advertenciaIndex) => (
                        <li key={`${advertencia}-${advertenciaIndex}`}>
                          {advertencia}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">
                  Revisión del Jefe Técnico
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  La información viene desde el diagnóstico IA. Puedes editarla
                  antes de aprobar.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observación / comentario del jefe técnico
                </label>

                <textarea
                  value={actual.motivo}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "motivo", event.target.value)
                  }
                  rows={3}
                  placeholder="Ejemplo: Se aprueba diagnóstico IA. Validar disponibilidad de repuestos antes de cotizar."
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Horas hombre estimadas / aprobadas
                </label>

                <input
                  type="number"
                  value={actual.horas}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "horas", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Procedimiento aprobado
                </label>

                <textarea
                  value={actual.procedimiento}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "procedimiento",
                      event.target.value
                    )
                  }
                  rows={7}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Repuestos aprobados / sugeridos
                </label>

                <textarea
                  value={actual.repuestos}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "repuestos", event.target.value)
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => guardar(equipo.id, "Aprobado")}
                  disabled={actual.guardando}
                  className="rounded-xl bg-green-600 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {actual.guardando
                    ? "Guardando..."
                    : actual.guardadoOk && actual.estado === "Aprobado"
                    ? "✓ Aprobado"
                    : "Aprobar diagnóstico"}
                </button>

                <button
                  type="button"
                  onClick={() => guardar(equipo.id, "Rechazado")}
                  disabled={actual.guardando}
                  className="rounded-xl bg-red-600 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {actual.guardando
                    ? "Guardando..."
                    : actual.guardadoOk && actual.estado === "Rechazado"
                    ? "✓ Rechazado"
                    : "Rechazar diagnóstico"}
                </button>

                {actual.estado === "Aprobado" && (
                  <button
                    type="button"
                    onClick={() => {
                      const hallazgosPDF =
                        actual.motivo ||
                        formatearHallazgosDesdeIA(actual.diagnosticoIA) ||
                        "Sin hallazgos registrados.";

                      descargarInformeEjecutivoMJ({
                        ot: "Informe técnico",
                        cliente: "-",
                        empresa: "-",
                        contacto: "-",
                        fechaIngreso: "-",
                        fechaEmision: new Date().toLocaleDateString("es-CL"),
                        tecnico: "-",
                        estado: actual.estado || "Revisión técnica",
                        equipos: [
                          {
                            titulo: `Equipo ${index + 1}`,
                            tipo: equipo.equipo || "Sin tipo",
                            marca: equipo.marca || "-",
                            modelo: equipo.modelo || "-",
                            serie: equipo.numero_serie || "-",
                            capacidad: "-",
                            hallazgos: hallazgosPDF,
                            trabajosRequeridos: formatearTrabajosParaPDF(
                              actual.procedimiento,
                              actual.repuestos
                            ),
                            estadoFinal:
                              actual.estado === "Aprobado"
                                ? "apto"
                                : actual.estado === "Rechazado"
                                ? "no_apto"
                                : "observaciones",
                            fotos: [],
                          },
                        ],
                      });
                    }}
                    className="rounded-xl bg-slate-900 px-5 py-4 text-sm font-bold text-white md:col-span-2"
                  >
                    Descargar informe técnico aprobado
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}