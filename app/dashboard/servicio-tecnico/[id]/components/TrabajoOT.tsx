"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId?: string;
  equipos?: any[];
  soloLectura?: boolean;
  edicionHistorica?: boolean;
  onEstadoActualizado?: (estado: string) => void;
};

type Equipo = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
};

type FotoEgreso = {
  id: string;
  nombre: string;
  url: string;
};

type DocumentoTrabajo = {
  id: string;
  tipo: "Certificado" | "Test de carga" | "Manual" | "Ficha técnica" | "Otro";
  nombre: string;
  comentario: string;
  url: string;
};

type EstadoCotizacionTrabajo = "pendiente" | "aprobada" | "rechazada";

type ResultadoFinalTrabajo =
  | "pendiente"
  | "listo_entrega"
  | "pendiente_repuesto"
  | "pendiente_validacion"
  | "no_reparable";

type TrabajoEquipo = {
  cotizacion_estado: EstadoCotizacionTrabajo;
  observacion_cotizacion: string;
  referencia_trabajo: string;
  referencia_repuestos: string;
  repuestos_cambiados: boolean;
  reparaciones_realizadas: boolean;
  ajustes_realizados: boolean;
  mantencion_limpieza_realizada: boolean;
  prueba_funcional: boolean;
  prueba_carga: boolean;
  equipo_limpio_entrega: boolean;
  horas_reales: string;
  observaciones: string;
  resultado_final: ResultadoFinalTrabajo;
  fotos_egreso: FotoEgreso[];
  documentos: DocumentoTrabajo[];
  guardando: boolean;
  guardadoOk: boolean;
};

function crearId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trabajoVacio(): TrabajoEquipo {
  return {
    cotizacion_estado: "pendiente",
    observacion_cotizacion: "",
    referencia_trabajo: "",
    referencia_repuestos: "",
    repuestos_cambiados: false,
    reparaciones_realizadas: false,
    ajustes_realizados: false,
    mantencion_limpieza_realizada: false,
    prueba_funcional: false,
    prueba_carga: false,
    equipo_limpio_entrega: false,
    horas_reales: "",
    observaciones: "",
    resultado_final: "pendiente",
    fotos_egreso: [],
    documentos: [],
    guardando: false,
    guardadoOk: false,
  };
}

function identificadorEquipo(equipo: Equipo) {
  if (equipo.numero_serie) return `Serie: ${equipo.numero_serie}`;
  if (equipo.codigo) return `Código: ${equipo.codigo}`;
  return `ID: ${equipo.id.slice(0, 8)}`;
}

function textoSeguro(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function generarTrabajoBase(equipoId: string): Partial<TrabajoEquipo> {
  const data = obtenerEquipoTrabajo(equipoId);
  const trabajo = (data.trabajo || {}) as any;

  const referenciaTrabajo =
    textoSeguro(trabajo.referencia_trabajo) ||
    textoSeguro(data.revision?.procedimiento_aprobado) ||
    textoSeguro(data.diagnostico?.procedimiento);

  const referenciaRepuestos =
    textoSeguro(trabajo.referencia_repuestos) ||
    textoSeguro(data.revision?.repuestos_aprobados) ||
    textoSeguro(data.diagnostico?.repuestos);

  const estadoCotizacion: EstadoCotizacionTrabajo =
    trabajo.cotizacion_estado === "aprobada" || trabajo.cotizacion_aprobada === true
      ? "aprobada"
      : trabajo.cotizacion_estado === "rechazada" ||
          trabajo.cotizacion_aprobada === false
        ? "rechazada"
        : "pendiente";

  return {
    cotizacion_estado: estadoCotizacion,
    observacion_cotizacion: textoSeguro(trabajo.observacion_cotizacion),
    referencia_trabajo: referenciaTrabajo,
    referencia_repuestos: referenciaRepuestos,
    repuestos_cambiados: Boolean(trabajo.repuestos_cambiados),
    reparaciones_realizadas: Boolean(trabajo.reparaciones_realizadas),
    ajustes_realizados: Boolean(trabajo.ajustes_realizados),
    mantencion_limpieza_realizada: Boolean(
      trabajo.mantencion_limpieza_realizada || trabajo.mantencion_realizada,
    ),
    prueba_funcional: Boolean(trabajo.prueba_funcional),
    prueba_carga: Boolean(trabajo.prueba_carga),
    equipo_limpio_entrega: Boolean(
      trabajo.equipo_limpio_entrega || trabajo.equipo_liberado,
    ),
    horas_reales:
      textoSeguro(trabajo.horas_reales) ||
      textoSeguro(data.revision?.horas_hombre) ||
      "",
    observaciones: textoSeguro(trabajo.observaciones),
    resultado_final:
      trabajo.resultado_final === "listo_entrega" || trabajo.equipo_liberado
        ? "listo_entrega"
        : trabajo.resultado_final === "pendiente_repuesto" ||
            trabajo.resultado_final === "pendiente_validacion" ||
            trabajo.resultado_final === "no_reparable"
          ? trabajo.resultado_final
          : "pendiente",
    fotos_egreso: Array.isArray(trabajo.fotos_egreso)
      ? (trabajo.fotos_egreso as FotoEgreso[])
      : [],
    documentos: Array.isArray(trabajo.documentos)
      ? (trabajo.documentos as DocumentoTrabajo[])
      : [],
  };
}

function archivoADataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function resumenTrabajoEjecutado(actual: TrabajoEquipo) {
  const lineas: string[] = [];

  if (actual.repuestos_cambiados) lineas.push("Repuestos cambiados / instalados.");
  if (actual.reparaciones_realizadas) lineas.push("Reparaciones realizadas.");
  if (actual.ajustes_realizados) lineas.push("Ajustes realizados.");
  if (actual.mantencion_limpieza_realizada) {
    lineas.push("Mantención / limpieza realizada.");
  }
  if (actual.prueba_funcional) lineas.push("Prueba funcional realizada OK.");
  if (actual.prueba_carga) lineas.push("Prueba de carga realizada OK.");
  if (actual.equipo_limpio_entrega) {
    lineas.push("Equipo limpio y listo para entrega/despacho.");
  }

  return lineas.join("\n");
}

function etiquetaResultado(resultado: ResultadoFinalTrabajo) {
  if (resultado === "listo_entrega") return "Listo para entrega/despacho";
  if (resultado === "pendiente_repuesto") return "Pendiente por repuesto";
  if (resultado === "pendiente_validacion") return "Pendiente por validación";
  if (resultado === "no_reparable") return "No reparable";
  return "Pendiente";
}

export default function TrabajoOT({
  ordenId,
  equipos: equiposIniciales,
  soloLectura = false,
  edicionHistorica = false,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [trabajos, setTrabajos] = useState<Record<string, TrabajoEquipo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarDatos() {
    if (!ordenId) return;

    setLoading(true);

    try {
      const { data: hijos } = await supabase
        .from("ordenes")
        .select("id,codigo,equipo,marca,modelo,numero_serie")
        .eq("orden_padre_id", ordenId)
        .order("codigo", { ascending: true });

      let equiposBase: Equipo[] = hijos || [];

      if (!equiposBase.length) {
        const { data: orden } = await supabase
          .from("ordenes")
          .select("id,codigo,equipo,marca,modelo,numero_serie")
          .eq("id", ordenId)
          .single();

        if (orden) equiposBase = [orden];
      }

      if (!equiposBase.length && equiposIniciales?.length) {
        equiposBase = equiposIniciales;
      }

      const estadoInicial: Record<string, TrabajoEquipo> = {};

      equiposBase.forEach((equipo) => {
        const base = generarTrabajoBase(equipo.id);

        estadoInicial[equipo.id] = {
          ...trabajoVacio(),
          ...base,
        };
      });

      setEquipos(equiposBase);
      setTrabajos(estadoInicial);
    } catch (e: any) {
      alert(e.message || "No se pudo cargar el trabajo");
    } finally {
      setLoading(false);
    }
  }

  function actualizarCampo<K extends keyof TrabajoEquipo>(
    equipoId: string,
    campo: K,
    valor: TrabajoEquipo[K],
  ) {
    if (soloLectura) return;

    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || trabajoVacio()),
        [campo]: valor,
        guardadoOk: false,
      },
    }));
  }

  async function agregarFotos(equipoId: string, files: FileList | null) {
    if (soloLectura || !files?.length) return;

    const actual = trabajos[equipoId] || trabajoVacio();
    const nuevasFotos: FotoEgreso[] = [];

    for (const file of Array.from(files)) {
      const url = await archivoADataUrl(file);

      nuevasFotos.push({
        id: crearId(),
        nombre: file.name,
        url,
      });
    }

    actualizarCampo(equipoId, "fotos_egreso", [
      ...actual.fotos_egreso,
      ...nuevasFotos,
    ]);
  }

  function eliminarFoto(equipoId: string, fotoId: string) {
    if (soloLectura) return;

    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "fotos_egreso",
      actual.fotos_egreso.filter((foto) => foto.id !== fotoId),
    );
  }

  async function agregarDocumento(equipoId: string, file: File | null) {
    if (soloLectura || !file) return;

    const actual = trabajos[equipoId] || trabajoVacio();
    const url = await archivoADataUrl(file);

    actualizarCampo(equipoId, "documentos", [
      ...actual.documentos,
      {
        id: crearId(),
        tipo: "Certificado",
        nombre: file.name,
        comentario: "",
        url,
      },
    ]);
  }

  function actualizarDocumento(
    equipoId: string,
    documentoId: string,
    campo: keyof DocumentoTrabajo,
    valor: string,
  ) {
    if (soloLectura) return;

    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "documentos",
      actual.documentos.map((documento) =>
        documento.id === documentoId
          ? {
              ...documento,
              [campo]: valor,
            }
          : documento,
      ),
    );
  }

  function eliminarDocumento(equipoId: string, documentoId: string) {
    if (soloLectura) return;

    const actual = trabajos[equipoId] || trabajoVacio();

    actualizarCampo(
      equipoId,
      "documentos",
      actual.documentos.filter((documento) => documento.id !== documentoId),
    );
  }

  async function guardarTrabajo(
    equipoId: string,
    opciones?: {
      cotizacionEstado?: EstadoCotizacionTrabajo;
      resultadoFinal?: ResultadoFinalTrabajo;
      actualizarOrden?: boolean;
    },
  ) {
    if (soloLectura) return;

    const actualBase = trabajos[equipoId] || trabajoVacio();
    const actual: TrabajoEquipo = {
      ...actualBase,
      cotizacion_estado: opciones?.cotizacionEstado || actualBase.cotizacion_estado,
      resultado_final: opciones?.resultadoFinal || actualBase.resultado_final,
      equipo_limpio_entrega:
        opciones?.resultadoFinal === "listo_entrega"
          ? true
          : actualBase.equipo_limpio_entrega,
    };

    if (actual.resultado_final === "listo_entrega") {
      if (!actual.prueba_funcional) {
        alert("Para pasar a Listo debes marcar la prueba funcional realizada OK.");
        return;
      }

      if (!actual.equipo_limpio_entrega) {
        alert("Para pasar a Listo debes marcar que el equipo quedó limpio y listo para entrega/despacho.");
        return;
      }
    }

    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...actual,
        guardando: true,
        guardadoOk: false,
      },
    }));

    try {
      guardarEquipoTrabajo(equipoId, {
        trabajo: {
          cotizacion_estado: actual.cotizacion_estado,
          cotizacion_aprobada:
            actual.cotizacion_estado === "aprobada"
              ? true
              : actual.cotizacion_estado === "rechazada"
                ? false
                : null,
          observacion_cotizacion: actual.observacion_cotizacion,
          referencia_trabajo: actual.referencia_trabajo,
          referencia_repuestos: actual.referencia_repuestos,
          trabajo_realizado: resumenTrabajoEjecutado(actual),
          repuestos_cambiados: actual.repuestos_cambiados,
          reparaciones_realizadas: actual.reparaciones_realizadas,
          ajustes_realizados: actual.ajustes_realizados,
          mantencion_limpieza_realizada: actual.mantencion_limpieza_realizada,
          prueba_funcional: actual.prueba_funcional,
          prueba_carga: actual.prueba_carga,
          equipo_limpio_entrega: actual.equipo_limpio_entrega,
          equipo_liberado: actual.resultado_final === "listo_entrega",
          horas_reales: actual.horas_reales,
          observaciones: actual.observaciones,
          resultado_final: actual.resultado_final,
          fotos_egreso: actual.fotos_egreso as any,
          documentos: actual.documentos as any,
        },
      } as any);

      if (opciones?.actualizarOrden !== false && !edicionHistorica) {
        const nuevoEstado =
          actual.cotizacion_estado === "rechazada"
            ? "cerrado"
            : actual.resultado_final === "listo_entrega"
              ? "listo"
              : "trabajo";

        await supabase
          .from("ordenes")
          .update({ estado: nuevoEstado })
          .eq("id", equipoId);

        if (ordenId) {
          await supabase
            .from("ordenes")
            .update({ estado: nuevoEstado })
            .eq("id", ordenId);

          await supabase
            .from("ordenes")
            .update({ estado: nuevoEstado })
            .eq("orden_padre_id", ordenId);

          onEstadoActualizado?.(nuevoEstado);
        }
      }

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          ...actual,
          guardando: false,
          guardadoOk: true,
        },
      }));
    } catch (e: any) {
      alert(e.message || "No se pudo guardar el trabajo");

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          guardando: false,
        },
      }));
    }
  }

  async function aprobarCotizacion(equipoId: string) {
    await guardarTrabajo(equipoId, {
      cotizacionEstado: "aprobada",
      resultadoFinal: "pendiente",
    });
  }

  async function rechazarCotizacion(equipoId: string) {
    const confirmar = window.confirm(
      "¿Confirmas que la cotización fue rechazada? La OT quedará cerrada.",
    );

    if (!confirmar) return;

    await guardarTrabajo(equipoId, {
      cotizacionEstado: "rechazada",
      resultadoFinal: "pendiente",
    });
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        Cargando trabajo...
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {soloLectura && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Trabajo guardado. Presiona Modificar etapa para habilitar cambios.
        </div>
      )}

      <fieldset
        disabled={soloLectura}
        className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-100"
      >
      {equipos.map((equipo, index) => {
        const actual = trabajos[equipo.id] || trabajoVacio();
        const cotizacionPendiente = actual.cotizacion_estado === "pendiente";
        const cotizacionAprobada = actual.cotizacion_estado === "aprobada";
        const cotizacionRechazada = actual.cotizacion_estado === "rechazada";
        const listoParaEntrega = actual.resultado_final === "listo_entrega";

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
              </div>

              {cotizacionPendiente && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                  Esperando aprobación de cotización
                </span>
              )}

              {cotizacionAprobada && !listoParaEntrega && (
                <span className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-800">
                  Cotización aprobada · Trabajo autorizado
                </span>
              )}

              {cotizacionRechazada && (
                <span className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-800">
                  Cotización rechazada · Servicio cerrado
                </span>
              )}

              {listoParaEntrega && (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800">
                  Listo para entrega/despacho
                </span>
              )}
            </div>

            {cotizacionPendiente && (
              <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div>
                  <h3 className="text-base font-bold text-amber-900">
                    Trabajo pendiente esperando aprobación de cotización
                  </h3>

                  <p className="mt-1 text-sm text-amber-800">
                    Antes de ejecutar trabajos, confirma si el cliente aprobó o
                    rechazó la cotización comercial.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-amber-900">
                    Observación comercial / cliente
                  </label>

                  <textarea
                    value={actual.observacion_cotizacion}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "observacion_cotizacion",
                        event.target.value,
                      )
                    }
                    rows={3}
                    placeholder="Ejemplo: Cliente aprueba por correo / Cliente rechaza cotización / Pendiente OC."
                    className="w-full resize-y rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => aprobarCotizacion(equipo.id)}
                    disabled={actual.guardando}
                    className="rounded-xl bg-green-600 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actual.guardando ? "Guardando..." : "Cotización aprobada"}
                  </button>

                  <button
                    type="button"
                    onClick={() => rechazarCotizacion(equipo.id)}
                    disabled={actual.guardando}
                    className="rounded-xl bg-red-600 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actual.guardando ? "Guardando..." : "Cotización rechazada"}
                  </button>
                </div>
              </div>
            )}

            {cotizacionRechazada && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
                <p className="font-bold">Servicio cerrado por cotización rechazada.</p>

                {actual.observacion_cotizacion && (
                  <p className="mt-2 whitespace-pre-wrap">
                    {actual.observacion_cotizacion}
                  </p>
                )}

                {!soloLectura && (
                <button
                  type="button"
                  onClick={() => aprobarCotizacion(equipo.id)}
                  disabled={actual.guardando}
                  className="mt-4 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Reabrir como cotización aprobada
                </button>
                )}
              </div>
            )}

            {cotizacionAprobada && (
              <div className="space-y-5">
                <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <summary className="cursor-pointer text-sm font-bold text-slate-800">
                    Ver trabajos aprobados como referencia
                  </summary>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Procedimiento aprobado
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {actual.referencia_trabajo || "Sin procedimiento registrado."}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white p-4">
                      <p className="text-xs font-bold uppercase text-slate-500">
                        Repuestos aprobados
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {actual.referencia_repuestos || "Sin repuestos registrados."}
                      </p>
                    </div>
                  </div>
                </details>

                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <h3 className="text-base font-bold text-green-900">
                    Cierre operativo del trabajo
                  </h3>

                  <p className="mt-1 text-sm text-green-800">
                    Marca solo lo ejecutado y adjunta evidencia final. No es
                    necesario volver a escribir todo el procedimiento aprobado.
                  </p>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={actual.repuestos_cambiados}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "repuestos_cambiados",
                            event.target.checked,
                          )
                        }
                      />
                      Repuestos cambiados / instalados
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={actual.reparaciones_realizadas}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "reparaciones_realizadas",
                            event.target.checked,
                          )
                        }
                      />
                      Reparaciones realizadas
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={actual.ajustes_realizados}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "ajustes_realizados",
                            event.target.checked,
                          )
                        }
                      />
                      Ajustes realizados
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={actual.mantencion_limpieza_realizada}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "mantencion_limpieza_realizada",
                            event.target.checked,
                          )
                        }
                      />
                      Mantención / limpieza realizada
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={actual.prueba_funcional}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "prueba_funcional",
                            event.target.checked,
                          )
                        }
                      />
                      Prueba funcional realizada OK
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={actual.prueba_carga}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "prueba_carga",
                            event.target.checked,
                          )
                        }
                      />
                      Prueba de carga realizada OK
                    </label>

                    <label className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-bold text-green-700 md:col-span-2">
                      <input
                        type="checkbox"
                        checked={actual.equipo_limpio_entrega}
                        onChange={(event) =>
                          actualizarCampo(
                            equipo.id,
                            "equipo_limpio_entrega",
                            event.target.checked,
                          )
                        }
                      />
                      Equipo limpio y listo para entrega/despacho
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Horas hombre reales
                  </label>

                  <input
                    type="number"
                    value={actual.horas_reales}
                    onChange={(event) =>
                      actualizarCampo(equipo.id, "horas_reales", event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Fotografías de egreso
                  </label>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => agregarFotos(equipo.id, event.target.files)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />

                  {!!actual.fotos_egreso.length && (
                    <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
                      {actual.fotos_egreso.map((foto) => (
                        <div
                          key={foto.id}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          <a href={foto.url} target="_blank" rel="noreferrer">
                            <img
                              src={foto.url}
                              alt={foto.nombre}
                              className="h-28 w-full object-cover"
                            />
                          </a>

                          <div className="p-2">
                            <p className="truncate text-xs font-semibold text-slate-600">
                              {foto.nombre}
                            </p>

                            <button
                              type="button"
                              onClick={() => eliminarFoto(equipo.id, foto.id)}
                              className="mt-2 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Documentos asociados
                  </label>

                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(event) =>
                      agregarDocumento(equipo.id, event.target.files?.[0] || null)
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />

                  {!!actual.documentos.length && (
                    <div className="mt-3 space-y-3">
                      {actual.documentos.map((documento) => (
                        <div
                          key={documento.id}
                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-3">
                            <select
                              value={documento.tipo}
                              onChange={(event) =>
                                actualizarDocumento(
                                  equipo.id,
                                  documento.id,
                                  "tipo",
                                  event.target.value,
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                            >
                              <option>Certificado</option>
                              <option>Test de carga</option>
                              <option>Manual</option>
                              <option>Ficha técnica</option>
                              <option>Otro</option>
                            </select>

                            <input
                              value={documento.nombre}
                              onChange={(event) =>
                                actualizarDocumento(
                                  equipo.id,
                                  documento.id,
                                  "nombre",
                                  event.target.value,
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                            />

                            <input
                              value={documento.comentario}
                              onChange={(event) =>
                                actualizarDocumento(
                                  equipo.id,
                                  documento.id,
                                  "comentario",
                                  event.target.value,
                                )
                              }
                              placeholder="Comentario"
                              className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <a
                              href={documento.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-bold text-blue-700"
                            >
                              Abrir documento
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                eliminarDocumento(equipo.id, documento.id)
                              }
                              className="rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Observación final del técnico
                  </label>

                  <textarea
                    value={actual.observaciones}
                    onChange={(event) =>
                      actualizarCampo(equipo.id, "observaciones", event.target.value)
                    }
                    rows={4}
                    placeholder="Ejemplo: Equipo probado funcionalmente, limpio y listo para despacho."
                    className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Resultado final
                  </label>

                  <select
                    value={actual.resultado_final}
                    onChange={(event) =>
                      actualizarCampo(
                        equipo.id,
                        "resultado_final",
                        event.target.value as ResultadoFinalTrabajo,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="listo_entrega">Listo para entrega/despacho</option>
                    <option value="pendiente_repuesto">Pendiente por repuesto</option>
                    <option value="pendiente_validacion">Pendiente por validación</option>
                    <option value="no_reparable">No reparable</option>
                  </select>
                </div>

                {!soloLectura && (
                  <div className="grid gap-3 border-t border-slate-200 pt-5 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => guardarTrabajo(equipo.id)}
                      disabled={actual.guardando}
                      className={`rounded-xl px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300 ${
                        actual.guardadoOk ? "bg-green-600" : "bg-blue-600"
                      } ${edicionHistorica ? "md:col-span-2" : ""}`}
                    >
                      {actual.guardando
                        ? "Guardando..."
                        : actual.guardadoOk
                          ? "Trabajo guardado"
                          : edicionHistorica
                            ? "Guardar cambios del trabajo"
                            : "Guardar avance"}
                    </button>

                    {!edicionHistorica && (
                      <button
                        type="button"
                        onClick={() =>
                          guardarTrabajo(equipo.id, {
                            resultadoFinal: "listo_entrega",
                          })
                        }
                        disabled={actual.guardando}
                        className="rounded-xl bg-green-700 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Listo para entrega/despacho
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
      </fieldset>
    </section>
  );
}
