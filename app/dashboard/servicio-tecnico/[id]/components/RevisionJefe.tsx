"use client";

import { useEffect, useState } from "react";
import { descargarInformeTecnico } from "../lib/informeTecnicoHTML";
import { supabase } from "../../../../lib/supabase";
import {
  guardarEquipoTrabajo,
  obtenerEquipoTrabajo,
} from "../lib/equipoTrabajoStore";

type Props = {
  ordenId: string;
  soloLectura?: boolean;
  edicionHistorica?: boolean;
  onEstadoActualizado?: (estado: string) => void;
};

type EquipoRevision = {
  id: string;
  codigo?: string | null;
  equipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  capacidad?: string | null;
  accesorios?: string | null;
  problema?: string | null;
  problema_reportado?: string | null;
  observaciones?: string | null;
  observaciones_ingreso?: string | null;
  fotos_estado_inicial?: unknown;
  fotos_ingreso?: unknown;
  fotos?: unknown;
  diagnostico_ia_json?: DiagnosticoIA | string | null;
  diagnostico_ia_fuente?: string | null;
  diagnostico_ia_generado_en?: string | null;
};

type DiagnosticoGuardado = {
  id: string;
  hallazgos: string | null;
  procedimiento: string | null;
  repuestos: string | null;
  updated_at?: string | null;
};

type OrdenInforme = {
  id: string;
  codigo: string | null;
  cliente: string | null;
  cliente_email: string | null;
  created_at: string | null;
  problema?: string | null;
  problema_reportado?: string | null;
  observaciones?: string | null;
  observaciones_ingreso?: string | null;
  fotos_estado_inicial?: unknown;
  fotos_ingreso?: unknown;
  fotos?: unknown;
};

type DiagnosticoIA = {
  resumenEjecutivo?: {
    equipoLlegado?: string;
    estadoGeneral?: string;
    nivelRiesgo?: string;
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
    clasificacion?: string;
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
  hallazgosDiagnostico: string;
  procedimiento: string;
  repuestos: string;
  guardando: boolean;
  guardadoOk: boolean;
  diagnosticoIA: DiagnosticoIA | null;
  diagnosticoId: string | null;
};

type CampoEditableRevision = "motivo" | "horas" | "procedimiento" | "repuestos";

type FotoInformeRevision = {
  nombre?: string;
  url?: string;
  etapa?: string;
  itemLabel?: string;
  observacion?: string;
  name?: string;
  filename?: string;
  foto_url?: string;
  publicUrl?: string;
  public_url?: string;
  preview?: string;
  src?: string;
  storage_path?: string;
};

type DocumentoInformeRevision = {
  nombre: string;
  url?: string;
  tipo?: string;
  comentario?: string;
};

function obtenerPrimerTexto(objeto: any, campos: string[]) {
  for (const campo of campos) {
    const valor = objeto?.[campo];
    if (valor !== null && valor !== undefined && String(valor).trim()) {
      return String(valor).trim();
    }
  }

  return "";
}

function normalizarListaFotos(valor: unknown, etapa: string, itemLabel?: string) {
  if (!valor) return [] as FotoInformeRevision[];

  let lista: any[] = [];

  if (typeof valor === "string") {
    const texto = valor.trim();

    if (!texto) return [];

    if (texto.startsWith("[") || texto.startsWith("{")) {
      try {
        const parseado = JSON.parse(texto);
        lista = Array.isArray(parseado) ? parseado : [parseado];
      } catch {
        lista = [texto];
      }
    } else {
      lista = [texto];
    }
  } else if (Array.isArray(valor)) {
    lista = valor;
  } else {
    lista = [valor];
  }

  return lista
    .map((item) => {
      if (!item) return null;

      if (typeof item === "string") {
        const url = item.trim();
        if (!url) return null;

        return {
          nombre: itemLabel || etapa,
          url,
          etapa,
          itemLabel,
        };
      }

      const url =
        item.url ||
        item.foto_url ||
        item.publicUrl ||
        item.public_url ||
        item.preview ||
        item.src ||
        "";

      if (!String(url).trim()) return null;

      return {
        nombre:
          item.nombre ||
          item.name ||
          item.filename ||
          item.item_label ||
          item.itemLabel ||
          itemLabel ||
          etapa,
        url: String(url).trim(),
        etapa: item.etapa || etapa,
        itemLabel: item.item_label || item.itemLabel || itemLabel,
        observacion: item.observacion || item.comentario || "",
      } as FotoInformeRevision;
    })
    .filter(Boolean) as FotoInformeRevision[];
}

function fotosUnicas(fotos: FotoInformeRevision[]) {
  const vistas = new Set<string>();

  return fotos.filter((foto) => {
    const clave = `${foto.url || ""}|${foto.nombre || ""}|${foto.itemLabel || ""}`;
    if (!foto.url || vistas.has(clave)) return false;
    vistas.add(clave);
    return true;
  });
}

function esOtraFotoChecklist(foto: FotoInformeRevision) {
  const texto = `${foto.nombre || ""} ${foto.itemLabel || ""} ${foto.etapa || ""}`.toLowerCase();

  return texto.includes("otra") || texto.includes("general checklist") || texto.includes("otras fotos");
}

function normalizarDocumento(valor: any): DocumentoInformeRevision | null {
  if (!valor) return null;

  const url =
    valor.url ||
    valor.publicUrl ||
    valor.public_url ||
    valor.documento_url ||
    valor.archivo_url ||
    "";

  const nombre =
    valor.nombre ||
    valor.name ||
    valor.filename ||
    valor.tipo ||
    "Documento";

  return {
    nombre,
    url: url ? String(url) : undefined,
    tipo: valor.tipo || valor.categoria || "Documento",
    comentario: valor.comentario || valor.observacion || "",
  };
}


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
    hallazgosDiagnostico: "",
    procedimiento: "",
    repuestos: "",
    guardando: false,
    guardadoOk: false,
    diagnosticoIA: null,
    diagnosticoId: null,
  };
}

function textoSeguro(valor: unknown) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
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
      hallazgos: trabajo.diagnostico?.hallazgos || "",
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

  return {
    hallazgos: trabajo.diagnostico?.hallazgos || "",
    procedimiento:
      trabajo.diagnostico?.procedimiento ||
      (acciones.length > 0 ? acciones.join("\n") : ""),
    repuestos: trabajo.diagnostico?.repuestos || repuestos.join("\n"),
  };
}

function formatearHorasDesdeIA(diagnosticoIA: DiagnosticoIA | null) {
  const minimo = Number(diagnosticoIA?.horasEstimadas?.minimo);
  const maximo = Number(diagnosticoIA?.horasEstimadas?.maximo);

  if (Number.isFinite(minimo) && Number.isFinite(maximo)) {
    const promedio = (minimo + maximo) / 2;
    return promedio % 1 === 0 ? String(promedio) : promedio.toFixed(1);
  }

  if (Number.isFinite(maximo)) return String(maximo);
  if (Number.isFinite(minimo)) return String(minimo);

  return "";
}

function construirDiagnosticoAprobadoJson(
  actual: RevisionPorEquipo,
  estadoFinal: "Aprobado" | "Rechazado",
) {
  return {
    version: "revision-jefe-mj-v2",
    aprobado: estadoFinal === "Aprobado",
    fecha_revision: new Date().toISOString(),
    observaciones_jefe: actual.motivo,
    horas_hombre_aprobadas: actual.horas ? Number(actual.horas) : null,
    hallazgos_aprobados: actual.hallazgosDiagnostico,
    procedimiento_aprobado: actual.procedimiento,
    repuestos_aprobados: actual.repuestos,
    diagnostico_id: actual.diagnosticoId,
    diagnostico_ia_original: actual.diagnosticoIA,
  };
}

export default function RevisionJefe({
  ordenId,
  soloLectura = false,
  edicionHistorica = false,
  onEstadoActualizado,
}: Props) {
  const [equipos, setEquipos] = useState<EquipoRevision[]>([]);
  const [ordenInforme, setOrdenInforme] = useState<OrdenInforme | null>(null);
  const [revisiones, setRevisiones] = useState<
    Record<string, RevisionPorEquipo>
  >({});
  const [fotosIngresoPorEquipo, setFotosIngresoPorEquipo] = useState<
    Record<string, FotoInformeRevision[]>
  >({});
  const [fotosChecklistPorEquipo, setFotosChecklistPorEquipo] = useState<
    Record<string, FotoInformeRevision[]>
  >({});
  const [otrasFotosChecklistPorEquipo, setOtrasFotosChecklistPorEquipo] = useState<
    Record<string, FotoInformeRevision[]>
  >({});
  const [fotosTrabajoPorEquipo, setFotosTrabajoPorEquipo] = useState<
    Record<string, FotoInformeRevision[]>
  >({});
  const [documentosTrabajoPorEquipo, setDocumentosTrabajoPorEquipo] = useState<
    Record<string, DocumentoInformeRevision[]>
  >({});
  const [observacionesChecklistPorEquipo, setObservacionesChecklistPorEquipo] =
    useState<Record<string, string>>({});

  useEffect(() => {
    cargarDatos();
  }, [ordenId]);

  async function cargarEvidencias(
    equiposBase: EquipoRevision[],
    ordenBase: OrdenInforme | null,
  ) {
    const ids = equiposBase.map((equipo) => equipo.id);

    const fotosIngresoMap: Record<string, FotoInformeRevision[]> = {};
    const fotosChecklistMap: Record<string, FotoInformeRevision[]> = {};
    const otrasFotosChecklistMap: Record<string, FotoInformeRevision[]> = {};
    const fotosTrabajoMap: Record<string, FotoInformeRevision[]> = {};
    const documentosTrabajoMap: Record<string, DocumentoInformeRevision[]> = {};
    const observacionesChecklistMap: Record<string, string> = {};

    equiposBase.forEach((equipo) => {
      const ordenAny = ordenBase as any;
      const equipoAny = equipo as any;

      fotosIngresoMap[equipo.id] = fotosUnicas([
        ...normalizarListaFotos(ordenAny?.fotos_estado_inicial, "Ingreso"),
        ...normalizarListaFotos(ordenAny?.fotos_ingreso, "Ingreso"),
        ...normalizarListaFotos(equipoAny?.fotos_estado_inicial, "Ingreso"),
        ...normalizarListaFotos(equipoAny?.fotos_ingreso, "Ingreso"),
      ]);
    });

    if (ids.length > 0) {
      const { data: checklists, error: errorChecklists } = await supabase
        .from("checklists_tecnicos")
        .select("orden_id,observaciones_generales")
        .in("orden_id", ids);

      if (errorChecklists) {
        console.error("Error cargando observaciones generales del checklist:", errorChecklists);
      }

      (checklists || []).forEach((registro: any) => {
        if (registro.orden_id) {
          observacionesChecklistMap[registro.orden_id] =
            registro.observaciones_generales || "";
        }
      });

      const { data: fotosChecklist, error: errorFotosChecklist } = await supabase
        .from("checklist_fotos")
        .select("*")
        .in("orden_id", ids);

      if (errorFotosChecklist) {
        console.error("Error cargando fotos del checklist:", errorFotosChecklist);
      }

      (fotosChecklist || []).forEach((registro: any) => {
        const ordenFotoId = registro.orden_id;
        if (!ordenFotoId) return;

        const foto = normalizarListaFotos(
          {
            url: registro.url || registro.foto_url || registro.public_url,
            nombre: registro.nombre || registro.item_label || "Foto checklist",
            item_label: registro.item_label,
            observacion: registro.observacion,
          },
          "Checklist / diagnóstico",
          registro.item_label || registro.nombre || "Checklist",
        )[0];

        if (!foto) return;

        if (esOtraFotoChecklist(foto)) {
          otrasFotosChecklistMap[ordenFotoId] = [
            ...(otrasFotosChecklistMap[ordenFotoId] || []),
            foto,
          ];
        } else {
          fotosChecklistMap[ordenFotoId] = [
            ...(fotosChecklistMap[ordenFotoId] || []),
            foto,
          ];
        }
      });

      const { data: fotosTrabajo, error: errorFotosTrabajo } = await supabase
        .from("reporte_fotos")
        .select("*")
        .in("orden_id", ids);

      if (errorFotosTrabajo) {
        console.error("Error cargando fotos de trabajo:", errorFotosTrabajo);
      }

      (fotosTrabajo || []).forEach((registro: any) => {
        const ordenFotoId = registro.orden_id;
        if (!ordenFotoId) return;

        const foto = normalizarListaFotos(
          {
            url: registro.url || registro.foto_url || registro.public_url,
            nombre: registro.nombre || registro.etapa || "Foto trabajo",
            item_label: registro.item_label || registro.etapa,
            observacion: registro.observacion || registro.comentario,
          },
          "Trabajo / egreso",
        )[0];

        if (!foto) return;

        fotosTrabajoMap[ordenFotoId] = [
          ...(fotosTrabajoMap[ordenFotoId] || []),
          foto,
        ];
      });

      const { data: documentosTrabajo, error: errorDocumentosTrabajo } =
        await supabase
          .from("reporte_documentos")
          .select("*")
          .in("orden_id", ids);

      if (errorDocumentosTrabajo) {
        console.error("Error cargando documentos de trabajo:", errorDocumentosTrabajo);
      }

      (documentosTrabajo || []).forEach((registro: any) => {
        const ordenDocumentoId = registro.orden_id;
        if (!ordenDocumentoId) return;

        const documento = normalizarDocumento(registro);
        if (!documento) return;

        documentosTrabajoMap[ordenDocumentoId] = [
          ...(documentosTrabajoMap[ordenDocumentoId] || []),
          documento,
        ];
      });
    }

    setFotosIngresoPorEquipo(fotosIngresoMap);
    setFotosChecklistPorEquipo(fotosChecklistMap);
    setOtrasFotosChecklistPorEquipo(otrasFotosChecklistMap);
    setFotosTrabajoPorEquipo(fotosTrabajoMap);
    setDocumentosTrabajoPorEquipo(documentosTrabajoMap);
    setObservacionesChecklistPorEquipo(observacionesChecklistMap);
  }

  async function cargarDatos() {
    const { data: ordenParaInforme, error: errorOrdenInforme } = await supabase
      .from("ordenes")
      .select("*")
      .eq("id", ordenId)
      .maybeSingle();

    if (errorOrdenInforme) {
      console.error("Error cargando datos de cliente para informe:", errorOrdenInforme);
    }

    setOrdenInforme((ordenParaInforme || null) as OrdenInforme | null);

    const { data: hijos, error: errorHijos } = await supabase
      .from("ordenes")
      .select("*")
      .eq("orden_padre_id", ordenId)
      .order("codigo", { ascending: true });

    if (errorHijos) {
      console.error("Error cargando equipos hijos para revisión:", errorHijos);
    }

    let equiposBase: EquipoRevision[] = (hijos || []) as EquipoRevision[];

    if (!equiposBase.length) {
      const { data: orden, error: errorOrden } = await supabase
        .from("ordenes")
        .select("*")
        .eq("id", ordenId)
        .maybeSingle();

      if (errorOrden) {
        console.error("Error cargando orden para revisión:", errorOrden);
      }

      if (orden) equiposBase = [orden as EquipoRevision];
    }

    setEquipos(equiposBase);
    await cargarEvidencias(equiposBase, (ordenParaInforme || null) as OrdenInforme | null);

    const nuevoEstado: Record<string, RevisionPorEquipo> = {};

    for (const equipo of equiposBase) {
      const { data: revision } = await supabase
        .from("revisiones_jefe")
        .select("*")
        .eq("orden_id", equipo.id)
        .maybeSingle();

      const { data: diagnosticoGuardado } = await supabase
        .from("diagnosticos")
        .select("id,hallazgos,procedimiento,repuestos,updated_at")
        .eq("orden_id", equipo.id)
        .maybeSingle();

      const respaldoLocal = generarDesdeChecklist(equipo.id);
      const diagnosticoIA = normalizarDiagnosticoIA(equipo.diagnostico_ia_json);
      const horasIA = formatearHorasDesdeIA(diagnosticoIA);

      const diagnosticoBase = {
        hallazgos: diagnosticoGuardado?.hallazgos || respaldoLocal.hallazgos || "",
        procedimiento:
          diagnosticoGuardado?.procedimiento || respaldoLocal.procedimiento || "",
        repuestos: diagnosticoGuardado?.repuestos || respaldoLocal.repuestos || "",
      };

      const revisionActualizadaEn = revision?.updated_at
        ? new Date(revision.updated_at).getTime()
        : 0;

      const diagnosticoActualizadoEn = diagnosticoGuardado?.updated_at
        ? new Date(diagnosticoGuardado.updated_at).getTime()
        : 0;

      const revisionEsMasNueva =
        Boolean(revision?.id) &&
        revisionActualizadaEn > 0 &&
        revisionActualizadaEn > diagnosticoActualizadoEn;

      const usarRevisionGuardada =
        revisionEsMasNueva && (revision?.aprobado === true || revision?.aprobado === false);

      nuevoEstado[equipo.id] = {
        idRevision: revision?.id || null,
        estado:
          revision?.aprobado === true
            ? "Aprobado"
            : revision?.aprobado === false
              ? "Rechazado"
              : "",
        motivo: usarRevisionGuardada ? revision?.motivo || "" : "",
        horas: usarRevisionGuardada
          ? revision?.horas_hombre?.toString() || horasIA
          : horasIA,
        hallazgosDiagnostico: usarRevisionGuardada
          ? revision?.diagnostico_aprobado_json?.hallazgos_aprobados ||
            diagnosticoBase.hallazgos
          : diagnosticoBase.hallazgos,
        procedimiento:
          usarRevisionGuardada && revision?.procedimiento_aprobado
            ? revision.procedimiento_aprobado
            : diagnosticoBase.procedimiento,
        repuestos:
          usarRevisionGuardada && revision?.repuestos_aprobados
            ? revision.repuestos_aprobados
            : diagnosticoBase.repuestos,
        guardando: false,
        guardadoOk: false,
        diagnosticoIA,
        diagnosticoId: diagnosticoGuardado?.id || null,
      };
    }

    setRevisiones(nuevoEstado);
  }

  function actualizarCampo(
    equipoId: string,
    campo: CampoEditableRevision,
    valor: string,
  ) {
    if (soloLectura) return;

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
    estadoFinal: "Aprobado" | "Rechazado",
  ) {
    if (soloLectura) return;

    const actual = revisiones[equipoId] || revisionVacia();

    if (estadoFinal === "Rechazado" && !actual.motivo.trim()) {
      alert("Debes indicar el motivo del rechazo.");
      return;
    }

    setRevisiones((prev) => ({
      ...prev,
      [equipoId]: {
        ...(prev[equipoId] || revisionVacia()),
        estado: estadoFinal,
        guardando: true,
        guardadoOk: false,
      },
    }));

    try {
      const diagnosticoAprobadoJson = construirDiagnosticoAprobadoJson(
        actual,
        estadoFinal,
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

      if (!edicionHistorica) {
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

          const revisionEquipo = revisiones[equipo.id];
          return revisionEquipo?.estado === "Aprobado";
        });

        if (todosAprobados) {
          await supabase
            .from("ordenes")
            .update({ estado: "cotizacion" })
            .eq("id", ordenId);

          onEstadoActualizado?.("cotizacion");
        }
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
      {soloLectura && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          Revisión guardada. Presiona Modificar etapa para habilitar cambios.
        </div>
      )}

      {equipos.map((equipo, index) => {
        const actual = revisiones[equipo.id] || revisionVacia();
        const tieneDiagnostico = Boolean(
          actual.hallazgosDiagnostico ||
          actual.procedimiento ||
          actual.repuestos,
        );

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

              {tieneDiagnostico && (
                <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-xs text-green-800">
                  <p className="font-bold">Diagnóstico cargado</p>
                  <p className="mt-1">
                    Fuente: diagnóstico técnico aprobado para revisión
                  </p>
                </div>
              )}
            </div>

            {!tieneDiagnostico && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-bold">No hay diagnóstico cargado.</p>
                <p className="mt-1">
                  Primero genera el diagnóstico desde el checklist. Luego vuelve
                  a esta pestaña para aprobarlo o editarlo.
                </p>
              </div>
            )}

            {tieneDiagnostico && (
              <div className="mb-6 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="rounded-xl bg-white p-4">
                  <p className="text-sm font-bold text-slate-800">
                    Diagnóstico técnico generado
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {actual.hallazgosDiagnostico ||
                      "Sin hallazgos registrados."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Procedimiento recomendado
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {actual.procedimiento ||
                        "Sin procedimiento recomendado registrado."}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white p-4">
                    <p className="text-sm font-bold text-slate-800">
                      Repuestos solicitados
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {actual.repuestos || "Sin repuestos solicitados."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-bold text-slate-900">
                  Revisión del Jefe Técnico
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  La información viene desde el diagnóstico técnico guardado.
                  {soloLectura
                    ? " La revisión se encuentra bloqueada."
                    : " Puedes editar procedimiento y repuestos antes de aprobar."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Observación / comentario del jefe técnico
                </label>

                <textarea
                  value={actual.motivo}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "motivo", event.target.value)
                  }
                  rows={3}
                  placeholder="Ejemplo: Se aprueba diagnóstico. Validar disponibilidad de repuestos antes de cotizar."
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Horas hombre estimadas / aprobadas
                </label>

                <input
                  type="number"
                  value={actual.horas}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "horas", event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Procedimiento aprobado
                </label>

                <textarea
                  value={actual.procedimiento}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(
                      equipo.id,
                      "procedimiento",
                      event.target.value,
                    )
                  }
                  rows={7}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Repuestos aprobados / sugeridos
                </label>

                <textarea
                  value={actual.repuestos}
                  disabled={soloLectura}
                  onChange={(event) =>
                    actualizarCampo(equipo.id, "repuestos", event.target.value)
                  }
                  rows={5}
                  className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:cursor-default disabled:bg-slate-50 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 md:grid-cols-2">
                {!soloLectura && (
                  <>
                    <button
                      type="button"
                      onClick={() => guardar(equipo.id, "Aprobado")}
                      disabled={actual.guardando || !tieneDiagnostico}
                      className="rounded-xl bg-green-600 px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {actual.guardando
                        ? "Guardando..."
                        : actual.guardadoOk && actual.estado === "Aprobado"
                          ? "Aprobado"
                          : edicionHistorica
                            ? "Guardar revisión aprobada"
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
                          ? "Rechazado"
                          : edicionHistorica
                            ? "Guardar revisión rechazada"
                            : "Rechazar diagnóstico"}
                    </button>
                  </>
                )}

                {actual.estado === "Aprobado" && (
                  <button
                    type="button"
                    onClick={() => {
                      const ordenAny = ordenInforme as any;
                      const equipoAny = equipo as any;

                      descargarInformeTecnico({
                        ot: ordenInforme?.codigo || equipo.codigo || "Informe técnico",
                        cliente: ordenInforme?.cliente || "-",
                        empresa: ordenInforme?.cliente || "-",
                        contacto: ordenInforme?.cliente_email || "-",
                        tecnicoResponsable: "-",
                        fechaIngreso: ordenInforme?.created_at
                          ? new Date(ordenInforme.created_at).toLocaleDateString("es-CL")
                          : "-",
                        fechaEmision: new Date().toLocaleDateString("es-CL"),
                        estado:
                          actual.estado === "Aprobado"
                            ? "Diagnóstico aprobado"
                            : actual.estado || "Revisión técnica",
                        problemaReportado: obtenerPrimerTexto(
                          equipoAny,
                          ["problema", "problema_reportado"],
                        ) || obtenerPrimerTexto(
                          ordenAny,
                          ["problema", "problema_reportado"],
                        ),
                        observacionesIngreso: obtenerPrimerTexto(
                          equipoAny,
                          ["observaciones_ingreso", "observaciones"],
                        ) || obtenerPrimerTexto(
                          ordenAny,
                          ["observaciones_ingreso", "observaciones"],
                        ),
                        equipos: [
                          {
                            titulo: `Equipo ${index + 1}`,
                            equipo: equipo.equipo || "Sin tipo",
                            marca: equipo.marca || "-",
                            modelo: equipo.modelo || "-",
                            numeroSerie: equipo.numero_serie || "-",
                            codigo: equipo.codigo || "-",
                            capacidad: equipo.capacidad || "-",
                            accesorios: equipo.accesorios || "-",
                            problemaReportado: obtenerPrimerTexto(
                              equipoAny,
                              ["problema", "problema_reportado"],
                            ) || obtenerPrimerTexto(
                              ordenAny,
                              ["problema", "problema_reportado"],
                            ),
                            observacionesIngreso: obtenerPrimerTexto(
                              equipoAny,
                              ["observaciones_ingreso", "observaciones"],
                            ) || obtenerPrimerTexto(
                              ordenAny,
                              ["observaciones_ingreso", "observaciones"],
                            ),
                            checklist: observacionesChecklistPorEquipo[equipo.id]
                              ? `Observaciones generales checklist:\n${observacionesChecklistPorEquipo[equipo.id]}`
                              : "",
                            diagnostico:
                              actual.hallazgosDiagnostico ||
                              "Sin hallazgos registrados.",
                            procedimiento: actual.procedimiento,
                            repuestos: actual.repuestos,
                            fotosIngreso: fotosIngresoPorEquipo[equipo.id] || [],
                            fotosChecklist: fotosChecklistPorEquipo[equipo.id] || [],
                            otrasFotosChecklist:
                              otrasFotosChecklistPorEquipo[equipo.id] || [],
                            fotosTrabajo: fotosTrabajoPorEquipo[equipo.id] || [],
                            documentosTrabajo:
                              documentosTrabajoPorEquipo[equipo.id] || [],
                            observaciones: actual.motivo,
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
