"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { obtenerEquipoTrabajo } from "../lib/equipoTrabajoStore";

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
  storage_path?: string;
};

type DocumentoTrabajo = {
  id: string;
  tipo: "Certificado" | "Test de carga" | "Manual" | "Ficha técnica" | "Otro";
  nombre: string;
  comentario: string;
  url: string;
  storage_path?: string;
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

// Los archivos se almacenan en el bucket existente "reportes" de Supabase.
// En trabajo_ot solo se guardan rutas y URLs, nunca archivos base64.
const BUCKET_TRABAJO = "reportes";

function nombreArchivoSeguro(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(0, 120);
}

async function subirArchivoTrabajo(
  equipoId: string,
  archivo: Blob,
  nombre: string,
  grupo: "fotos" | "documentos",
) {
  const ruta = `trabajo/${equipoId}/${grupo}/${crearId()}-${nombreArchivoSeguro(nombre)}`;
  const { error } = await supabase.storage.from(BUCKET_TRABAJO).upload(ruta, archivo, {
    contentType: archivo.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`No se pudo subir ${nombre}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET_TRABAJO).getPublicUrl(ruta);
  return { url: data.publicUrl, storage_path: ruta };
}

// Compatibilidad con imágenes/documentos antiguos que quedaron como base64.
async function migrarArchivoLocal(
  equipoId: string,
  url: string,
  nombre: string,
  grupo: "fotos" | "documentos",
) {
  if (!url.startsWith("data:")) return null;
  const respuesta = await fetch(url);
  const archivo = await respuesta.blob();
  return subirArchivoTrabajo(equipoId, archivo, nombre, grupo);
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

// Solo se sincronizan datos técnicos estructurados. Las fotografías y los
// documentos requieren Supabase Storage y se abordarán en otra etapa.
function datosTrabajoPersistibles(actual: TrabajoEquipo) {
  return {
    cotizacion_estado: actual.cotizacion_estado,
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
    fotos_egreso: actual.fotos_egreso,
    documentos: actual.documentos,
  };
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
  const [subiendoArchivos, setSubiendoArchivos] = useState<Record<string, boolean>>({});
  const [trabajosBloqueados, setTrabajosBloqueados] = useState<Record<string, boolean>>({});
  const [cierresExistentes, setCierresExistentes] = useState<Record<string, boolean>>({});

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

      // La base de datos es la fuente de verdad para los datos del trabajo.
      // LocalStorage solo se conserva para compatibilidad con OT antiguas
      // y para archivos aún no migrados a Supabase Storage.
      const idsEquipos = equiposBase.map((equipo) => equipo.id);
      const { data: trabajosGuardados, error: errorTrabajos } = idsEquipos.length
        ? await supabase
            .from("trabajo_ot")
            .select("orden_id,datos_trabajo")
            .in("orden_id", idsEquipos)
        : { data: [], error: null };

      if (errorTrabajos) throw new Error(`No se pudo leer trabajo_ot: ${errorTrabajos.message}`);

      const registrosPorEquipo = new Map<string, Record<string, any>>(
        (trabajosGuardados || []).map((registro: any): [string, Record<string, any>] => [
          registro.orden_id as string,
          (registro.datos_trabajo || {}) as Record<string, any>,
        ]),
      );

      const estadoInicial: Record<string, TrabajoEquipo> = {};
      const bloqueosIniciales: Record<string, boolean> = {};
      const cierresIniciales: Record<string, boolean> = {};

      equiposBase.forEach((equipo) => {
        const baseLocal = generarTrabajoBase(equipo.id);
        const guardado = registrosPorEquipo.get(equipo.id);
        // Los cierres antiguos ya registrados también comienzan bloqueados.
        // La sola aprobación comercial no bloquea el formulario de trabajo.
        const tieneCierreAnterior = Boolean(
          guardado && (
            guardado.cierre_guardado === true ||
            (guardado.cierre_guardado !== false && (
              guardado.repuestos_cambiados ||
              guardado.reparaciones_realizadas ||
              guardado.ajustes_realizados ||
              guardado.mantencion_limpieza_realizada ||
              guardado.prueba_funcional ||
              guardado.prueba_carga ||
              guardado.equipo_limpio_entrega ||
              textoSeguro(guardado.observaciones) ||
              (Array.isArray(guardado.fotos_egreso) && guardado.fotos_egreso.length > 0) ||
              (Array.isArray(guardado.documentos) && guardado.documentos.length > 0)
            ))
          )
        );
        bloqueosIniciales[equipo.id] = tieneCierreAnterior || edicionHistorica;
        cierresIniciales[equipo.id] = tieneCierreAnterior || edicionHistorica;
        const base = guardado
          ? {
              ...baseLocal,
              ...guardado,
              cotizacion_estado: guardado.cotizacion_estado || "pendiente",
              resultado_final: guardado.resultado_final || "pendiente",
            }
          : baseLocal;

        estadoInicial[equipo.id] = {
          ...trabajoVacio(),
          ...base,
          fotos_egreso: Array.isArray(guardado?.fotos_egreso)
            ? guardado.fotos_egreso
            : baseLocal.fotos_egreso || [],
          documentos: Array.isArray(guardado?.documentos)
            ? guardado.documentos
            : baseLocal.documentos || [],
        };
      });

      setEquipos(equiposBase);
      setTrabajos(estadoInicial);
      setTrabajosBloqueados(bloqueosIniciales);
      setCierresExistentes(cierresIniciales);
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
    if (soloLectura || trabajosBloqueados[equipoId]) return;

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
    if (soloLectura || trabajosBloqueados[equipoId] || !files?.length || subiendoArchivos[equipoId]) return;
    setSubiendoArchivos((prev) => ({ ...prev, [equipoId]: true }));
    try {
      const nuevasFotos: FotoEgreso[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) throw new Error("Selecciona una imagen válida.");
        const subida = await subirArchivoTrabajo(equipoId, file, file.name, "fotos");
        nuevasFotos.push({ id: crearId(), nombre: file.name, ...subida });
        setTrabajos((prev) => ({
          ...prev,
          [equipoId]: {
            ...(prev[equipoId] || trabajoVacio()),
            fotos_egreso: [...(prev[equipoId]?.fotos_egreso || []), nuevasFotos[nuevasFotos.length - 1]],
            guardadoOk: false,
          },
        }));
      }
    } catch (e: any) {
      alert(e?.message || "No se pudieron subir las fotografías.");
    } finally {
      setSubiendoArchivos((prev) => ({ ...prev, [equipoId]: false }));
    }
  }

  function eliminarFoto(equipoId: string, fotoId: string) {
    if (soloLectura || trabajosBloqueados[equipoId]) return;
    // No borrar en Storage antes de guardar para no romper documentos ya registrados.
    setTrabajos((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || trabajoVacio()),
        fotos_egreso: (prev[equipoId]?.fotos_egreso || []).filter((f) => f.id !== fotoId),
        guardadoOk: false,
      },
    }));
  }

  async function agregarDocumento(equipoId: string, file: File | null) {
    if (soloLectura || trabajosBloqueados[equipoId] || !file || subiendoArchivos[equipoId]) return;
    setSubiendoArchivos((prev) => ({ ...prev, [equipoId]: true }));
    try {
      const subida = await subirArchivoTrabajo(equipoId, file, file.name, "documentos");
      const documento: DocumentoTrabajo = {
        id: crearId(),
        tipo: "Certificado",
        nombre: file.name,
        comentario: "",
        ...subida,
      };
      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          documentos: [...(prev[equipoId]?.documentos || []), documento],
          guardadoOk: false,
        },
      }));
    } catch (e: any) {
      alert(e?.message || "No se pudo subir el documento.");
    } finally {
      setSubiendoArchivos((prev) => ({ ...prev, [equipoId]: false }));
    }
  }

  function actualizarDocumento(
    equipoId: string,
    documentoId: string,
    campo: keyof DocumentoTrabajo,
    valor: string,
  ) {
    if (soloLectura || trabajosBloqueados[equipoId]) return;

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
    if (soloLectura || trabajosBloqueados[equipoId]) return;

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
    if (soloLectura || trabajosBloqueados[equipoId] || subiendoArchivos[equipoId]) return;

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
      // Migrar al guardar las posibles fotos/documentos antiguos en base64.
      // La información y las nuevas URLs solo se publican en la OT después del upsert.
      const fotosPersistidas: FotoEgreso[] = [];
      for (const foto of actual.fotos_egreso) {
        const migrada = await migrarArchivoLocal(equipoId, foto.url, foto.nombre, "fotos");
        fotosPersistidas.push(migrada ? { ...foto, ...migrada } : foto);
      }
      const documentosPersistidos: DocumentoTrabajo[] = [];
      for (const doc of actual.documentos) {
        const migrado = await migrarArchivoLocal(equipoId, doc.url, doc.nombre, "documentos");
        documentosPersistidos.push(migrado ? { ...doc, ...migrado } : doc);
      }
      const actualPersistido = {
        ...actual,
        fotos_egreso: fotosPersistidas,
        documentos: documentosPersistidos,
      };
      const datosPersistibles = {
        ...datosTrabajoPersistibles(actualPersistido),
        // Aprobar/rechazar la cotización no equivale a cerrar el trabajo.
        cierre_guardado: opciones?.cotizacionEstado
          ? Boolean((actualBase as any).cierre_guardado)
          : true,
      };
      const { error: errorGuardarDb } = await supabase
        .from("trabajo_ot")
        .upsert(
          {
            orden_id: equipoId,
            descripcion: datosPersistibles.trabajo_realizado,
            observaciones: actual.observaciones,
            datos_trabajo: datosPersistibles,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "orden_id" },
        );

      if (errorGuardarDb) {
        throw new Error(`No se pudo guardar el trabajo en Supabase: ${errorGuardarDb.message}`);
      }

      // No escribir en localStorage: los archivos base64 superan su cuota.
      // La fuente de verdad del trabajo es Supabase.

      if (opciones?.actualizarOrden !== false && !edicionHistorica) {
        const nuevoEstado =
          actual.cotizacion_estado === "rechazada"
            ? "cerrado"
            : actual.resultado_final === "listo_entrega"
              ? "listo"
              : "trabajo";

        const { error: errorEstadoEquipo } = await supabase
          .from("ordenes")
          .update({ estado: nuevoEstado })
          .eq("id", equipoId);
        if (errorEstadoEquipo) throw new Error(errorEstadoEquipo.message);

        if (ordenId && ordenId !== equipoId) {
          const { error: errorEstadoMadre } = await supabase
            .from("ordenes")
            .update({ estado: nuevoEstado })
            .eq("id", ordenId);
          if (errorEstadoMadre) throw new Error(errorEstadoMadre.message);

          // Mantener el comportamiento existente de las órdenes por lote.
          const { error: errorEstadosHijos } = await supabase
            .from("ordenes")
            .update({ estado: nuevoEstado })
            .eq("orden_padre_id", ordenId);
          if (errorEstadosHijos) throw new Error(errorEstadosHijos.message);
        }

        onEstadoActualizado?.(nuevoEstado);
      }

      setTrabajos((prev) => ({
        ...prev,
        [equipoId]: {
          ...(prev[equipoId] || trabajoVacio()),
          ...actualPersistido,
          guardando: false,
          guardadoOk: true,
        },
      }));
      if (!opciones?.cotizacionEstado) {
        setCierresExistentes((prev) => ({ ...prev, [equipoId]: true }));
        setTrabajosBloqueados((prev) => ({ ...prev, [equipoId]: true }));
      }
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
      {equipos.map((equipo, index) => {
        const actual = trabajos[equipo.id] || trabajoVacio();
        const cotizacionPendiente = actual.cotizacion_estado === "pendiente";
        const cotizacionAprobada = actual.cotizacion_estado === "aprobada";
        const cotizacionRechazada = actual.cotizacion_estado === "rechazada";
        const listoParaEntrega = actual.resultado_final === "listo_entrega";
        const bloqueado = soloLectura || Boolean(trabajosBloqueados[equipo.id]);

        return (
          <div
            key={equipo.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            {cierresExistentes[equipo.id] && (
              <div className={`mb-4 flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${bloqueado ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {bloqueado ? "Trabajo guardado" : "Modificando Trabajo"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {bloqueado ? "La información está bloqueada para evitar cambios accidentales." : "Guarda los cambios para volver a bloquear la etapa."}
                  </p>
                </div>
                {bloqueado && !soloLectura && (
                  <button
                    type="button"
                    onClick={() => setTrabajosBloqueados((prev) => ({ ...prev, [equipo.id]: false }))}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"
                  >
                    Modificar etapa
                  </button>
                )}
              </div>
            )}
            <fieldset disabled={bloqueado} className="m-0 min-w-0 space-y-5 border-0 p-0 disabled:opacity-100">
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
                    disabled={actual.guardando || subiendoArchivos[equipo.id]}
                    className="rounded-xl bg-green-600 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {actual.guardando ? "Guardando..." : "Cotización aprobada"}
                  </button>

                  <button
                    type="button"
                    onClick={() => rechazarCotizacion(equipo.id)}
                    disabled={actual.guardando || subiendoArchivos[equipo.id]}
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
                  disabled={actual.guardando || subiendoArchivos[equipo.id]}
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

                  {subiendoArchivos[equipo.id] && (
                    <p className="mt-2 text-xs font-semibold text-blue-700">Subiendo archivo a Supabase...</p>
                  )}
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
                      disabled={actual.guardando || subiendoArchivos[equipo.id]}
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
                        disabled={actual.guardando || subiendoArchivos[equipo.id]}
                        className="rounded-xl bg-green-700 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Listo para entrega/despacho
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            </fieldset>
          </div>
        );
      })}
    </section>
  );
}
