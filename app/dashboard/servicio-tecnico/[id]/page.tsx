"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import TabsOT from "./components/TabsOT";
import HeaderOT from "./components/HeaderOT";
import TimelineOT from "./components/TimelineOT";
import DetalleEquipo from "./components/DetalleEquipo";
import DetalleCliente from "./components/DetalleCliente";
import FotosIngreso from "./components/FotosIngreso";
import DocumentosIngreso from "./components/DocumentosIngreso";
import Reportes from "./components/Reportes";
import ModalFoto from "./components/ModalFoto";
import ProblemaOT from "./components/ProblemaOT";
import ChecklistIngreso from "./components/ChecklistIngreso";
import ChecklistEspecial from "./components/ChecklistEspecial";
import ChecklistInteligente from "./components/ChecklistInteligente";
import ChecklistLote from "./components/ChecklistLote";
import DiagnosticoTecnico from "./components/DiagnosticoTecnico";
import RevisionJefe from "./components/RevisionJefe";
import CotizacionInterna from "./components/CotizacionInterna";
import TrabajoOT from "./components/TrabajoOT";
import EquiposLote from "./components/EquiposLote";
import { guardarEquipoTrabajo } from "./lib/equipoTrabajoStore";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: string;
  prioridad?: string | null;
  created_at?: string | null;
  cliente_email?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  accesorios_entregados?: string | null;
  problema_reportado?: string | null;
  observaciones_iniciales?: string | null;
  fotos_estado_inicial?: string | string[] | null;
  cantidad_equipos?: number | null;
  orden_padre_id?: string | null;
};

type EquipoLote = {
  id: string;
  codigo: string | null;
  equipo: string | null;
  marca?: string | null;
  modelo?: string | null;
  numero_serie?: string | null;
  estado: string | null;
  problema_reportado?: string | null;
};

type OrdenDocumento = {
  id: string;
  orden_id: string;
  nombre: string | null;
  tipo: string | null;
  url: string | null;
  storage_path: string | null;
  created_at: string | null;
};

type ReporteFoto = {
  id: string;
  reporte_id?: string;
  foto_url: string;
  storage_path: string | null;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type ReporteDocumento = {
  id: string;
  reporte_id: string;
  orden_id: string;
  nombre: string | null;
  tipo: string | null;
  url: string | null;
  storage_path: string | null;
  created_at: string | null;
};

type Reporte = {
  id: string;
  orden_id: string;
  etapa: string;
  tecnico?: string | null;
  descripcion: string | null;
  hallazgos: string | null;
  acciones: string | null;
  costo: number | null;
  created_at: string;
  reporte_fotos?: ReporteFoto[];
  reporte_documentos?: ReporteDocumento[];
};

const ETAPAS = [
  "Ingreso",
  "Checklist",
  "Diagnóstico",
  "Revisión",
  "Cotización",
  "Trabajo",
  "Listo",
  "Entregado",
];

type TabOT =
  | "detalle"
  | "checklist"
  | "diagnostico"
  | "revision"
  | "cotizacion"
  | "trabajo"
  | "reportes";

const INDICE_ETAPA_POR_TAB: Record<Exclude<TabOT, "reportes">, number> = {
  detalle: 0,
  checklist: 1,
  diagnostico: 2,
  revision: 3,
  cotizacion: 4,
  trabajo: 5,
};

function esEquipoEspecial(equipo?: string | null) {
  if (!equipo) return false;

  const texto = equipo
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return (
    texto === "otro" ||
    texto === "otro / trabajo especial" ||
    texto.startsWith("otro / trabajo especial:")
  );
}

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Ingreso";

  const e = estado.toLowerCase().trim();

  if (e.includes("entregado")) return "Entregado";
  if (e.includes("listo")) return "Listo";

  if (
    e.includes("trabajo") ||
    e.includes("mantenimiento") ||
    e.includes("reparación") ||
    e.includes("reparacion")
  ) {
    return "Trabajo";
  }

  if (
    e.includes("cotización") ||
    e.includes("cotizacion") ||
    e.includes("comercial")
  ) {
    return "Cotización";
  }

  if (
    e.includes("revisión") ||
    e.includes("revision") ||
    e.includes("jefe") ||
    e.includes("aprobado")
  ) {
    return "Revisión";
  }

  if (e.includes("diagnóstico") || e.includes("diagnostico")) {
    return "Diagnóstico";
  }

  if (e.includes("checklist")) return "Checklist";

  return "Ingreso";
}

function tabDesdeEstado(estado: string): TabOT {
  const estadoNormal = normalizarEstado(estado);

  if (estadoNormal === "Checklist") return "checklist";
  if (estadoNormal === "Diagnóstico") return "diagnostico";
  if (estadoNormal === "Revisión") return "revision";
  if (estadoNormal === "Cotización") return "cotizacion";
  if (
    estadoNormal === "Trabajo" ||
    estadoNormal === "Listo" ||
    estadoNormal === "Entregado"
  ) {
    return "trabajo";
  }

  return "detalle";
}

function calcularEstadoActualDesdeDatos(
  ordenData: Orden,
  equiposData: EquipoLote[],
) {
  const esLote =
    Number(ordenData?.cantidad_equipos || 1) > 1 || equiposData.length > 0;

  if (!esLote || equiposData.length === 0) {
    return normalizarEstado(ordenData.estado);
  }

  const indices = equiposData.map((equipo) => {
    const estado = normalizarEstado(equipo.estado);
    const index = ETAPAS.indexOf(estado);
    return index >= 0 ? index : 0;
  });

  return ETAPAS[Math.min(...indices)] || normalizarEstado(ordenData.estado);
}

function badgeEstado(estado: string) {
  const estadoNormal = normalizarEstado(estado);

  if (estadoNormal === "Cotización") return { bg: "#fef3c7", color: "#b45309" };
  if (estadoNormal === "Listo" || estadoNormal === "Entregado")
    return { bg: "#dcfce7", color: "#15803d" };
  if (estadoNormal === "Trabajo") return { bg: "#dcfce7", color: "#15803d" };
  if (estadoNormal === "Revisión") return { bg: "#fef3c7", color: "#b45309" };
  if (estadoNormal === "Diagnóstico")
    return { bg: "#ede9fe", color: "#6d28d9" };
  if (estadoNormal === "Checklist") return { bg: "#e0f2fe", color: "#0369a1" };

  return { bg: "#dbeafe", color: "#2563eb" };
}

function normalizarFotosIngreso(fotos?: string | string[] | null) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) return fotos.filter(Boolean);

  if (typeof fotos === "string") {
    try {
      const parsed = JSON.parse(fotos);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}

    return fotos
      .split(",")
      .map((foto) => foto.trim())
      .filter(Boolean);
  }

  return [];
}

function esUrlImagen(url?: string | null, tipo?: string | null, nombre?: string | null) {
  const texto = `${url || ""} ${tipo || ""} ${nombre || ""}`.toLowerCase();

  return (
    texto.includes("image/") ||
    texto.includes("foto") ||
    texto.includes("imagen") ||
    texto.includes("jpg") ||
    texto.includes("jpeg") ||
    texto.includes("png") ||
    texto.includes("webp") ||
    texto.includes("gif")
  );
}

function unirFotosSinDuplicar(fotos: string[]) {
  return Array.from(new Set(fotos.filter(Boolean)));
}


function limpiarNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

function serializarRespuestasChecklist(respuestas: Record<string, any>) {
  const salida: Record<string, any> = {};

  Object.entries(respuestas || {}).forEach(([itemId, respuesta]) => {
    salida[itemId] = {
      estado: respuesta?.estado || "pendiente",
      observacion: respuesta?.observacion || "",
      acciones: Array.isArray(respuesta?.acciones) ? respuesta.acciones : [],
      repuesto_nombre: respuesta?.repuesto_nombre || "",
      repuesto_cantidad: respuesta?.repuesto_cantidad || "",
      accion_otro: respuesta?.accion_otro || "",
      cantidad_fotos: Array.isArray(respuesta?.fotos) ? respuesta.fotos.length : 0,
    };
  });

  return salida;
}

function serializarItemsMalosChecklist(itemsMalos: any[]) {
  return (itemsMalos || []).map((registro) => ({
    item: {
      id: registro?.item?.id || "",
      label: registro?.item?.label || "",
      sistema: registro?.item?.sistema || "",
      afectaSeguridad: Boolean(registro?.item?.afectaSeguridad),
    },
    respuesta: {
      estado: registro?.respuesta?.estado || "",
      observacion: registro?.respuesta?.observacion || "",
      acciones: Array.isArray(registro?.respuesta?.acciones)
        ? registro.respuesta.acciones
        : [],
      repuesto_nombre: registro?.respuesta?.repuesto_nombre || "",
      repuesto_cantidad: registro?.respuesta?.repuesto_cantidad || "",
      accion_otro: registro?.respuesta?.accion_otro || "",
      cantidad_fotos: Array.isArray(registro?.respuesta?.fotos)
        ? registro.respuesta.fotos.length
        : 0,
    },
  }));
}

async function guardarChecklistTecnicoEnSupabase(payload: any) {
  const equipoId = payload?.equipoId;

  if (!equipoId) {
    return;
  }

  const respuestas = payload?.respuestas || {};
  const checklist = payload?.checklist || null;
  const itemsMalos = Array.isArray(payload?.itemsMalos) ? payload.itemsMalos : [];

  const respuestasDb = serializarRespuestasChecklist(respuestas);
  const itemsMalosDb = serializarItemsMalosChecklist(itemsMalos);

  const { error: errorChecklist } = await supabase
    .from("checklists_tecnicos")
    .upsert(
      {
        orden_id: equipoId,
        tipo_equipo: payload?.tipoEquipo || null,
        checklist_nombre: checklist?.nombre || null,
        checklist_descripcion: checklist?.descripcion || null,
        checklist_json: checklist || {},
        respuestas_json: respuestasDb,
        items_malos_json: itemsMalosDb,
        observaciones_generales: payload?.observacionesGenerales || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "orden_id" },
    );

  if (errorChecklist) {
    throw new Error(errorChecklist.message);
  }

  const { data: fotosAnteriores } = await supabase
    .from("checklist_fotos")
    .select("storage_path")
    .eq("orden_id", equipoId);

  const pathsAnteriores = (fotosAnteriores || [])
    .map((foto: any) => foto.storage_path)
    .filter(Boolean);

  if (pathsAnteriores.length > 0) {
    await supabase.storage.from("reportes").remove(pathsAnteriores);
  }

  await supabase.from("checklist_fotos").delete().eq("orden_id", equipoId);

  const itemsPorId: Record<string, any> = {};

  const seccionesChecklist = checklist?.sections || checklist?.secciones || [];

  seccionesChecklist.forEach((seccion: any) => {
    (seccion?.items || []).forEach((item: any) => {
      if (item?.id) {
        itemsPorId[item.id] = item;
      }
    });
  });

  itemsPorId.otras_fotos_checklist = {
    id: "otras_fotos_checklist",
    label: "Otras fotos del checklist",
  };

  const fotosInsertar: any[] = [];

  for (const [itemId, respuesta] of Object.entries(respuestas) as Array<[
    string,
    any,
  ]>) {
    const fotos = Array.isArray(respuesta?.fotos) ? respuesta.fotos : [];

    for (let index = 0; index < fotos.length; index += 1) {
      const foto = fotos[index] as File;

      if (!(foto instanceof File)) {
        continue;
      }

      const nombreSeguro = limpiarNombreArchivo(foto.name || `foto-${index}.jpg`);
      const storagePath = `checklist/${equipoId}/${itemId}-${Date.now()}-${index}-${nombreSeguro}`;

      const { error: errorUpload } = await supabase.storage
        .from("reportes")
        .upload(storagePath, foto, {
          cacheControl: "3600",
          upsert: true,
        });

      if (errorUpload) {
        throw new Error(errorUpload.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from("reportes")
        .getPublicUrl(storagePath);

      fotosInsertar.push({
        orden_id: equipoId,
        item_id: itemId,
        item_label: itemsPorId[itemId]?.label || itemId,
        url: publicUrlData.publicUrl,
        storage_path: storagePath,
        nombre: foto.name || nombreSeguro,
        observacion: respuesta?.observacion || null,
      });
    }
  }

  if (fotosInsertar.length > 0) {
    const { error: errorFotos } = await supabase
      .from("checklist_fotos")
      .insert(fotosInsertar);

    if (errorFotos) {
      throw new Error(errorFotos.message);
    }
  }
}


type EventoLogisticaOT = {
  id: string;
  tipo: "retiro" | "despacho";
  estado: "solicitado" | "agendado" | "en_ruta" | "realizado" | "cancelado";
  fecha: string;
  hora: string | null;
  cliente: string | null;
  direccion: string | null;
  comuna: string | null;
  observacion: string | null;
  codigo_ot: string | null;
};

type FormularioLogisticaListo = {
  tipo: "retiro" | "despacho";
  fecha: string;
  hora: string;
  direccion: string;
  comuna: string;
  observacion: string;
};

function fechaHoyISO() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatearFechaCL(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function formatearHoraCL(hora?: string | null) {
  if (!hora) return "Sin hora";
  return hora.slice(0, 5);
}

function etiquetaEstadoLogistica(estado?: string | null) {
  if (estado === "solicitado") return "Solicitado";
  if (estado === "agendado") return "Agendado";
  if (estado === "en_ruta") return "En ruta";
  if (estado === "realizado") return "Realizado";
  if (estado === "cancelado") return "Cancelado";
  return "Pendiente";
}

function formularioLogisticaInicial(): FormularioLogisticaListo {
  return {
    tipo: "retiro",
    fecha: fechaHoyISO(),
    hora: "",
    direccion: "Taller MJ Industrial",
    comuna: "",
    observacion: "Cliente retira equipo en taller MJ Industrial.",
  };
}


function escaparHtml(valor: any) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textoConSaltos(valor: any) {
  const texto = escaparHtml(valor || "-");
  return texto.replace(/\n/g, "<br />");
}

function renderCampoInforme(label: string, valor: any) {
  return `
    <div class="field">
      <span>${escaparHtml(label)}</span>
      <strong>${escaparHtml(valor || "-")}</strong>
    </div>
  `;
}

function renderFotosInforme(
  titulo: string,
  fotos: Array<{ url: string; nombre?: string | null; detalle?: string | null }>,
) {
  const fotosValidas = fotos.filter((foto) => Boolean(foto?.url));

  if (fotosValidas.length === 0) return "";

  return `
    <section class="section pageBreakInsideAvoid">
      <h3>${escaparHtml(titulo)}</h3>
      <div class="photoGrid">
        ${fotosValidas
          .map(
            (foto, index) => `
              <a class="photoCard" href="${escaparHtml(foto.url)}" target="_blank" rel="noopener noreferrer">
                <img src="${escaparHtml(foto.url)}" alt="${escaparHtml(
                  foto.nombre || `${titulo} ${index + 1}`,
                )}" />
                <span>${escaparHtml(foto.nombre || `Foto ${index + 1}`)}</span>
                ${foto.detalle ? `<small>${escaparHtml(foto.detalle)}</small>` : ""}
              </a>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderFotosChecklistInforme(
  fotos: Array<{
    item_label?: string | null;
    item_id?: string | null;
    nombre?: string | null;
    url?: string | null;
    observacion?: string | null;
  }>,
) {
  const fotosValidas = fotos.filter((foto) => Boolean(foto?.url));

  if (fotosValidas.length === 0) return "";

  const grupos = fotosValidas.reduce<Record<string, typeof fotosValidas>>(
    (acc, foto) => {
      const nombreGrupo =
        foto.item_label ||
        foto.item_id ||
        "Fotos del checklist / diagnóstico";
      if (!acc[nombreGrupo]) acc[nombreGrupo] = [];
      acc[nombreGrupo].push(foto);
      return acc;
    },
    {},
  );

  return `
    <section class="section pageBreakInsideAvoid">
      <h3>Fotos del checklist / diagnóstico</h3>
      ${Object.entries(grupos)
        .map(
          ([grupo, grupoFotos]) => `
            <div class="photoGroup">
              <h4>${escaparHtml(grupo)}</h4>
              <div class="photoGrid">
                ${grupoFotos
                  .map(
                    (foto, index) => `
                      <a class="photoCard" href="${escaparHtml(
                        foto.url,
                      )}" target="_blank" rel="noopener noreferrer">
                        <img src="${escaparHtml(foto.url)}" alt="${escaparHtml(
                          foto.nombre || `${grupo} ${index + 1}`,
                        )}" />
                        <span>${escaparHtml(foto.nombre || `Foto ${index + 1}`)}</span>
                        ${
                          foto.observacion
                            ? `<small>${escaparHtml(foto.observacion)}</small>`
                            : ""
                        }
                      </a>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          `,
        )
        .join("")}
    </section>
  `;
}

function renderDocumentosInforme(
  documentos: Array<{ nombre?: string | null; tipo?: string | null; url?: string | null }>,
) {
  const docsValidos = documentos.filter((doc) => Boolean(doc?.url));

  if (docsValidos.length === 0) return "";

  return `
    <section class="section pageBreakInsideAvoid">
      <h3>Documentos / certificados asociados</h3>
      <ul class="docsList">
        ${docsValidos
          .map(
            (doc, index) => `
              <li>
                <a href="${escaparHtml(doc.url)}" target="_blank" rel="noopener noreferrer">
                  ${escaparHtml(doc.nombre || `Documento ${index + 1}`)}
                </a>
                ${doc.tipo ? `<span>${escaparHtml(doc.tipo)}</span>` : ""}
              </li>
            `,
          )
          .join("")}
      </ul>
    </section>
  `;
}

function AvisoLote({ equipos }: { equipos: EquipoLote[] }) {
  return (
    <div className="avisoLote">
      <h2>Esta es una OT madre de lote</h2>
      <p>
        Para evitar mezclar información, el checklist, diagnóstico, revisión,
        cotización y trabajo se realizan dentro de cada equipo del lote.
      </p>
      <EquiposLote equipos={equipos} />

      <style jsx>{`
        .avisoLote {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
        }

        h2 {
          margin: 0 0 8px;
          color: #111827;
          font-size: 20px;
        }

        p {
          margin: 0 0 16px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        }
        .ingresoActions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .guardarIngreso {
          border: none;
          background: #2563eb;
          color: white;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
        }

        .guardarIngreso:hover {
          background: #1d4ed8;
        }

      `}</style>
    </div>
  );
}

function ControlEtapaGuardada({
  titulo,
  enEdicion,
  onCambiar,
}: {
  titulo: string;
  enEdicion: boolean;
  onCambiar: () => void;
}) {
  return (
    <div
      className={`mb-4 flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between ${
        enEdicion
          ? "border-amber-200 bg-amber-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <div>
        <p
          className={`text-sm font-bold ${
            enEdicion ? "text-amber-900" : "text-green-900"
          }`}
        >
          {enEdicion ? `Modificando ${titulo}` : `${titulo} guardado`}
        </p>
        <p
          className={`mt-1 text-xs ${
            enEdicion ? "text-amber-800" : "text-green-800"
          }`}
        >
          {enEdicion
            ? "Los cambios se guardarán sin modificar la etapa actual de la OT."
            : "La información está bloqueada para evitar cambios accidentales."}
        </p>
      </div>

      <button
        type="button"
        onClick={onCambiar}
        className={`rounded-xl px-4 py-2 text-sm font-bold text-white ${
          enEdicion ? "bg-slate-700" : "bg-blue-600"
        }`}
      >
        {enEdicion ? "Terminar edición" : "Modificar etapa"}
      </button>
    </div>
  );
}

export default function DetalleOrdenPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [equiposLote, setEquiposLote] = useState<EquipoLote[]>([]);
  const [documentosIngreso, setDocumentosIngreso] = useState<OrdenDocumento[]>(
    [],
  );
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [eliminandoFotoId, setEliminandoFotoId] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [tab, setTab] = useState<TabOT>("detalle");
  const [etapasEditando, setEtapasEditando] = useState<
    Record<string, boolean>
  >({});
  const [eventoLogistica, setEventoLogistica] =
    useState<EventoLogisticaOT | null>(null);
  const [formularioLogistica, setFormularioLogistica] =
    useState<FormularioLogisticaListo>(() => formularioLogisticaInicial());
  const [creandoSolicitudLogistica, setCreandoSolicitudLogistica] =
    useState(false);
  const [notificandoCliente, setNotificandoCliente] = useState(false);

  const fotosIngreso = useMemo(() => {
    const fotosDesdeOrden = normalizarFotosIngreso(orden?.fotos_estado_inicial);
    const fotosDesdeDocumentos = documentosIngreso
      .filter((doc) => esUrlImagen(doc.url, doc.tipo, doc.nombre))
      .map((doc) => doc.url || "")
      .filter(Boolean);

    return unirFotosSinDuplicar([...fotosDesdeOrden, ...fotosDesdeDocumentos]);
  }, [orden?.fotos_estado_inicial, documentosIngreso]);

  const reportesOrdenados = useMemo(() => {
    return [...reportes].sort((a, b) => {
      const fechaA = new Date(a.created_at || "").getTime();
      const fechaB = new Date(b.created_at || "").getTime();
      return fechaA - fechaB;
    });
  }, [reportes]);

  const esOtMadreLote = useMemo(() => {
    return Number(orden?.cantidad_equipos || 1) > 1 || equiposLote.length > 0;
  }, [orden?.cantidad_equipos, equiposLote.length]);

  const estadoActual = useMemo(() => {
    if (!orden) return "Ingreso";

    if (esOtMadreLote) {
      const estadosHijos = equiposLote.map((equipo) =>
        normalizarEstado(equipo.estado),
      );

      if (estadosHijos.length === 0) {
        return normalizarEstado(orden.estado);
      }

      const indices = estadosHijos.map((estado) => {
        const index = ETAPAS.indexOf(estado);
        return index >= 0 ? index : 0;
      });

      const menorIndice = Math.min(...indices);

      return ETAPAS[menorIndice] || "Ingreso";
    }

    return normalizarEstado(orden.estado);
  }, [orden, esOtMadreLote, equiposLote]);

  const etapaActualIndex = useMemo(() => {
    const index = ETAPAS.indexOf(estadoActual);
    return index >= 0 ? index : 0;
  }, [estadoActual]);

  function cambiarTabSeguro(nuevaTab: TabOT) {
    if (nuevaTab === "reportes") {
      setTab(nuevaTab);
      return;
    }

    const indiceDestino = INDICE_ETAPA_POR_TAB[nuevaTab];

    if (indiceDestino > etapaActualIndex) {
      alert("Esta etapa todavía no está disponible para la OT.");
      return;
    }

    setTab(nuevaTab);
  }

  function etapaEnEdicion(clave: string) {
    return Boolean(etapasEditando[clave]);
  }

  function alternarEdicionEtapa(clave: string) {
    setEtapasEditando((prev) => ({
      ...prev,
      [clave]: !prev[clave],
    }));
  }

  useEffect(() => {
    cargarDatos();
  }, [id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFotoModal(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  async function cargarDatos(mantenerTab = false) {
    if (!id) {
      setError("No se encontró el ID de la orden");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data: ordenData, error: errorOrden } = await supabase
      .from("ordenes")
      .select("*")
      .eq("id", id)
      .single();

    if (errorOrden || !ordenData) {
      setError(errorOrden?.message || "No se encontró la orden");
      setLoading(false);
      return;
    }

    const { data: equiposData, error: errorEquipos } = await supabase
      .from("ordenes")
      .select(
        "id,codigo,equipo,marca,modelo,numero_serie,estado,problema_reportado",
      )
      .eq("orden_padre_id", id)
      .order("codigo", { ascending: true });

    if (errorEquipos) {
      setError(errorEquipos.message);
      setLoading(false);
      return;
    }

    const { data: documentosData, error: errorDocumentos } = await supabase
      .from("orden_documentos")
      .select("*")
      .eq("orden_id", id)
      .order("created_at", { ascending: true });

    if (errorDocumentos) {
      setError(errorDocumentos.message);
      setLoading(false);
      return;
    }

    const { data: reportesData, error: errorReportes } = await supabase
      .from("reportes")
      .select(
        `
        *,
        reporte_fotos (
          id,
          reporte_id,
          foto_url,
          storage_path,
          comentario,
          orden,
          es_principal
        ),
        reporte_documentos (
          id,
          reporte_id,
          orden_id,
          nombre,
          tipo,
          url,
          storage_path,
          created_at
        )
      `,
      )
      .eq("orden_id", id)
      .order("created_at", { ascending: true });

    if (errorReportes) {
      setError(errorReportes.message);
      setLoading(false);
      return;
    }

    const reportesNormalizados = ((reportesData || []) as Reporte[]).map(
      (reporte) => ({
        ...reporte,
        reporte_fotos: [...(reporte.reporte_fotos || [])].sort((a, b) => {
          const ordenA = a.orden ?? 0;
          const ordenB = b.orden ?? 0;
          return ordenA - ordenB;
        }),
        reporte_documentos: [...(reporte.reporte_documentos || [])].sort(
          (a, b) => {
            const fechaA = new Date(a.created_at || "").getTime();
            const fechaB = new Date(b.created_at || "").getTime();
            return fechaA - fechaB;
          },
        ),
      }),
    );

    const { data: eventoLogisticaData } = await supabase
      .from("agenda_logistica")
      .select(
        "id,tipo,estado,fecha,hora,cliente,direccion,comuna,observacion,codigo_ot",
      )
      .eq("orden_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ordenNormalizada = ordenData as Orden;
    const equiposNormalizados = (equiposData || []) as EquipoLote[];
    const estadoCargado = calcularEstadoActualDesdeDatos(
      ordenNormalizada,
      equiposNormalizados,
    );

    setEventoLogistica((eventoLogisticaData as EventoLogisticaOT) || null);
    setOrden(ordenNormalizada);
    setEquiposLote(equiposNormalizados);
    setDocumentosIngreso((documentosData || []) as OrdenDocumento[]);
    setReportes(reportesNormalizados);

    if (!mantenerTab) {
      setTab(tabDesdeEstado(estadoCargado));
      setEtapasEditando({});
    }

    setLoading(false);
  }

  async function eliminarFotoDb(foto: ReporteFoto) {
    if (!foto?.id) return;

    setEliminandoFotoId(foto.id);

    try {
      if (foto.storage_path) {
        const { error: errorStorage } = await supabase.storage
          .from("reportes")
          .remove([foto.storage_path]);

        if (errorStorage) throw new Error(errorStorage.message);
      }

      const { error: errorDb } = await supabase
        .from("reporte_fotos")
        .delete()
        .eq("id", foto.id);

      if (errorDb) throw new Error(errorDb.message);

      setReportes((prev) =>
        prev.map((reporte) => {
          const contieneFoto = reporte.reporte_fotos?.some(
            (f) => f.id === foto.id,
          );
          if (!contieneFoto) return reporte;

          return {
            ...reporte,
            reporte_fotos: (reporte.reporte_fotos || []).filter(
              (f) => f.id !== foto.id,
            ),
          };
        }),
      );

      setFotoModal(null);
    } catch (e: any) {
      alert(e.message || "No se pudo eliminar la foto");
    } finally {
      setEliminandoFotoId(null);
    }
  }

  async function confirmarEliminarFoto(foto: ReporteFoto) {
    const confirmar = window.confirm("¿Eliminar esta foto?");
    if (!confirmar) return;
    await eliminarFotoDb(foto);
  }

  async function guardarIngresoYAvanzar() {
    if (!orden) return;

    const { error: errorEstado } = await supabase
      .from("ordenes")
      .update({ estado: "Checklist" })
      .eq("id", orden.id);

    if (errorEstado) {
      alert(errorEstado.message || "No se pudo guardar el ingreso.");
      return;
    }

    setOrden((prev) => {
      if (!prev) return prev;
      return { ...prev, estado: "Checklist" };
    });

    setTab("checklist");
    await cargarDatos();
  }

  async function generarPDF() {
    if (!orden) return;

    setGenerandoPdf(true);

    try {
      const [{ data: diagnosticoData }, { data: checklistData }, { data: checklistFotosData }] =
        await Promise.all([
          supabase
            .from("diagnosticos")
            .select("hallazgos,procedimiento,repuestos,updated_at,created_at")
            .eq("orden_id", orden.id)
            .maybeSingle(),
          supabase
            .from("checklists_tecnicos")
            .select("observaciones_generales")
            .eq("orden_id", orden.id)
            .maybeSingle(),
          supabase
            .from("checklist_fotos")
            .select("id,item_id,item_label,nombre,url,observacion,created_at")
            .eq("orden_id", orden.id)
            .order("created_at", { ascending: true }),
        ]);

      const logoUrl = `${window.location.origin}/logo-informe.png`;
      const fechaIngreso = orden.created_at
        ? new Date(orden.created_at).toLocaleDateString("es-CL")
        : "-";
      const fechaEmision = new Date().toLocaleDateString("es-CL");

      const fotosIngresoInforme = fotosIngreso.map((url, index) => ({
        url,
        nombre: `Foto ingreso ${index + 1}`,
      }));

      const fotosChecklistInforme = ((checklistFotosData || []) as any[]).map(
        (foto) => ({
          item_label: foto.item_label,
          item_id: foto.item_id,
          nombre: foto.nombre,
          url: foto.url,
          observacion: foto.observacion,
        }),
      );

      const fotosTrabajoInforme = reportesOrdenados.flatMap((reporte) =>
        (reporte.reporte_fotos || []).map((foto, index) => ({
          url: foto.foto_url,
          nombre:
            foto.comentario ||
            `${reporte.etapa || "Trabajo"} - Foto ${index + 1}`,
          detalle: reporte.etapa || "Trabajo / egreso",
        })),
      );

      const documentosInforme = [
        ...documentosIngreso.map((doc) => ({
          nombre: doc.nombre,
          tipo: doc.tipo || "Documento ingreso",
          url: doc.url,
        })),
        ...reportesOrdenados.flatMap((reporte) =>
          (reporte.reporte_documentos || []).map((doc) => ({
            nombre: doc.nombre,
            tipo: doc.tipo || reporte.etapa || "Documento técnico",
            url: doc.url,
          })),
        ),
      ];

      const reporteDiagnostico = reportesOrdenados.find(
        (reporte) =>
          reporte.etapa?.toLowerCase().includes("diagn") ||
          Boolean(reporte.hallazgos),
      );

      const reporteTrabajo = [...reportesOrdenados]
        .reverse()
        .find(
          (reporte) =>
            reporte.etapa?.toLowerCase().includes("trab") ||
            reporte.etapa?.toLowerCase().includes("listo") ||
            reporte.etapa?.toLowerCase().includes("entreg"),
        );

      const hallazgos =
        (diagnosticoData as any)?.hallazgos ||
        reporteDiagnostico?.hallazgos ||
        reporteDiagnostico?.descripcion ||
        "Sin diagnóstico registrado.";

      const procedimiento =
        (diagnosticoData as any)?.procedimiento ||
        reporteDiagnostico?.acciones ||
        "Sin procedimiento registrado.";

      const repuestos =
        (diagnosticoData as any)?.repuestos ||
        "Sin repuestos registrados.";

      const trabajoFinal =
        reporteTrabajo?.descripcion ||
        reporteTrabajo?.acciones ||
        "Sin trabajo final registrado.";

      const observacionesChecklist =
        (checklistData as any)?.observaciones_generales || "";

      const estadoInforme =
        estadoActual === "Entregado"
          ? "ENTREGADO"
          : estadoActual === "Listo"
            ? "LISTO PARA ENTREGA / DESPACHO"
            : estadoActual === "Revisión"
              ? "EN REVISIÓN TÉCNICA"
              : estadoActual === "Trabajo"
                ? "EN TRABAJO"
                : estadoActual.toUpperCase();

      const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe técnico ${escaparHtml(orden.codigo)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e5e7eb;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
    }
    .printBar {
      position: sticky;
      top: 0;
      z-index: 20;
      background: #1d4ed8;
      color: white;
      text-align: center;
      padding: 10px;
      font-weight: 900;
      cursor: pointer;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 18px auto;
      padding: 18mm;
      background: white;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.18);
    }
    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 18px;
      border-bottom: 3px solid #1e3a8a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .logo {
      width: 160px;
      height: auto;
      object-fit: contain;
    }
    .titleBlock h1 {
      margin: 10px 0 0;
      color: #1e3a8a;
      font-size: 24px;
      letter-spacing: 0.06em;
    }
    .meta {
      text-align: right;
      line-height: 1.45;
      font-size: 11px;
      color: #334155;
    }
    .meta strong {
      display: block;
      color: #0f172a;
      font-size: 18px;
      margin-bottom: 4px;
    }
    .status {
      display: inline-flex;
      margin-top: 8px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 900;
      background: ${estadoActual === "Listo" || estadoActual === "Entregado" ? "#dcfce7" : "#fef3c7"};
      color: ${estadoActual === "Listo" || estadoActual === "Entregado" ? "#166534" : "#92400e"};
    }
    .grid2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .grid4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .field {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px;
      min-height: 44px;
    }
    .field span {
      display: block;
      color: #64748b;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .field strong {
      display: block;
      color: #0f172a;
      font-size: 12px;
      line-height: 1.35;
    }
    .section {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      margin: 10px 0;
      background: white;
    }
    .section h3 {
      margin: 0 0 8px;
      color: #1e3a8a;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
    }
    .section p {
      margin: 0;
      line-height: 1.55;
      white-space: normal;
    }
    .photoGroup {
      margin-top: 10px;
    }
    .photoGroup h4 {
      margin: 0 0 6px;
      color: #334155;
      font-size: 11px;
    }
    .photoGrid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }
    .photoCard {
      display: block;
      border: 1px solid #dbe3ef;
      border-radius: 8px;
      padding: 5px;
      text-decoration: none;
      color: #0f172a;
      background: #f8fafc;
      break-inside: avoid;
    }
    .photoCard img {
      display: block;
      width: 100%;
      height: 72px;
      object-fit: cover;
      border-radius: 6px;
      margin-bottom: 5px;
      background: #e5e7eb;
    }
    .photoCard span {
      display: block;
      font-size: 9px;
      font-weight: 900;
      line-height: 1.25;
      word-break: break-word;
    }
    .photoCard small {
      display: block;
      margin-top: 2px;
      color: #64748b;
      font-size: 8px;
      line-height: 1.25;
      word-break: break-word;
    }
    .docsList {
      margin: 0;
      padding-left: 16px;
    }
    .docsList li {
      margin: 5px 0;
      line-height: 1.4;
    }
    .docsList a {
      color: #1d4ed8;
      font-weight: 800;
      text-decoration: none;
    }
    .docsList span {
      color: #64748b;
      margin-left: 6px;
      font-size: 10px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 34px;
      text-align: center;
      font-size: 10px;
      font-weight: 900;
    }
    .signatureLine {
      border-top: 1px solid #0f172a;
      padding-top: 8px;
    }
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 9px;
    }
    .pageBreakInsideAvoid { break-inside: avoid; page-break-inside: avoid; }
    @media print {
      body { background: white; }
      .printBar { display: none; }
      .page {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 12mm;
        box-shadow: none;
      }
      a { color: inherit; }
      .section, .field, .photoCard { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="printBar" onclick="window.print()">Imprimir / Guardar PDF</div>
  <main class="page">
    <header class="top">
      <div class="titleBlock">
        <img class="logo" src="${logoUrl}" alt="MJ Industrial" />
        <h1>INFORME TÉCNICO</h1>
      </div>
      <div class="meta">
        <strong>${escaparHtml(orden.codigo)}</strong>
        Estado: ${escaparHtml(estadoInforme)}<br />
        Fecha ingreso: ${escaparHtml(fechaIngreso)}<br />
        Fecha emisión: ${escaparHtml(fechaEmision)}<br />
        <span class="status">${escaparHtml(estadoInforme)}</span>
      </div>
    </header>

    <section class="grid2">
      ${renderCampoInforme("Cliente", orden.cliente)}
      ${renderCampoInforme("Empresa", orden.cliente)}
      ${renderCampoInforme("Contacto", orden.cliente_email)}
      ${renderCampoInforme("Técnico responsable", "-")}
    </section>

    <section class="section pageBreakInsideAvoid">
      <h3>Equipo 1</h3>
      <div class="grid4">
        ${renderCampoInforme("Tipo", orden.equipo)}
        ${renderCampoInforme("Marca", orden.marca)}
        ${renderCampoInforme("Modelo", orden.modelo)}
        ${renderCampoInforme("Serie", orden.numero_serie)}
      </div>
      <div class="grid2">
        ${renderCampoInforme("Capacidad", (orden as any).capacidad || "-")}
        ${renderCampoInforme("Accesorios", orden.accesorios_entregados || "-")}
      </div>
    </section>

    <section class="section pageBreakInsideAvoid">
      <h3>Problema reportado al ingreso</h3>
      <p><strong>Problema:</strong><br />${textoConSaltos(orden.problema_reportado || "-")}</p>
      <p style="margin-top:8px;"><strong>Observaciones iniciales:</strong><br />${textoConSaltos(orden.observaciones_iniciales || "-")}</p>
    </section>

    ${renderFotosInforme("Fotos de ingreso", fotosIngresoInforme)}

    <section class="section pageBreakInsideAvoid">
      <h3>Hallazgos / diagnóstico técnico</h3>
      <p>${textoConSaltos(hallazgos)}</p>
      ${
        observacionesChecklist
          ? `<p style="margin-top:8px;"><strong>Observaciones generales checklist:</strong><br />${textoConSaltos(
              observacionesChecklist,
            )}</p>`
          : ""
      }
    </section>

    ${renderFotosChecklistInforme(fotosChecklistInforme)}

    <section class="section pageBreakInsideAvoid">
      <h3>Trabajos requeridos / procedimiento recomendado</h3>
      <p>${textoConSaltos(procedimiento)}</p>
      <p style="margin-top:8px;"><strong>Repuestos sugeridos / solicitados:</strong><br />${textoConSaltos(
        repuestos,
      )}</p>
    </section>

    <section class="section pageBreakInsideAvoid">
      <h3>Trabajo realizado / cierre operativo</h3>
      <p>${textoConSaltos(trabajoFinal)}</p>
    </section>

    ${renderFotosInforme("Fotos de trabajo / egreso", fotosTrabajoInforme)}

    ${renderDocumentosInforme(documentosInforme)}

    <section class="signatures">
      <div class="signatureLine">Servicio Técnico MJ Industrial</div>
      <div class="signatureLine">Cliente / Responsable</div>
    </section>

    <footer class="footer">
      MJ Industrial · www.mjindustrial.cl · Informe generado digitalmente
    </footer>
  </main>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () {
        window.print();
      }, 600);
    });
  </script>
</body>
</html>`;

      const ventana = window.open("", "_blank");

      if (!ventana) {
        alert(
          "No se pudo abrir el informe técnico. Revisa si el navegador bloqueó la ventana emergente.",
        );
        return;
      }

      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
    } catch (error: any) {
      alert(error?.message || "No se pudo generar el informe técnico.");
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function avanzarADiagnostico(payload?: any) {
    if (!orden) return;

    const equipoId = payload?.equipoId || orden.id;
    const diagnosticoIA = payload?.diagnostico;
    const preservarEstadoActual = Boolean(payload?.preservarEstadoActual);

    try {
      if (
        payload?.respuestas &&
        payload?.checklist &&
        !payload?.checklistPersistido
      ) {
        await guardarChecklistTecnicoEnSupabase({
          ...payload,
          equipoId,
        });
      }
    } catch (error: any) {
      alert(
        error?.message ||
          "No se pudo guardar el checklist técnico y sus fotos. No se avanzará hasta corregirlo.",
      );
      return;
    }

    if (diagnosticoIA) {
      const hallazgos =
        diagnosticoIA.diagnosticoTecnico ||
        diagnosticoIA.hallazgos ||
        diagnosticoIA.resumen ||
        "Sin hallazgos registrados.";

      const procedimiento = Array.isArray(
        diagnosticoIA.procedimientoRecomendado,
      )
        ? diagnosticoIA.procedimientoRecomendado.join("\n")
        : diagnosticoIA.procedimientoRecomendado || "";

      const repuestos = Array.isArray(diagnosticoIA.repuestosSugeridos)
        ? diagnosticoIA.repuestosSugeridos.join("\n")
        : diagnosticoIA.repuestosSugeridos || "";

      guardarEquipoTrabajo(equipoId, {
        diagnostico: {
          hallazgos,
          procedimiento,
          repuestos,
        },
      });

      const { data: existente, error: errorExiste } = await supabase
        .from("diagnosticos")
        .select("id")
        .eq("orden_id", equipoId)
        .maybeSingle();

      if (errorExiste) {
        alert(errorExiste.message);
        return;
      }

      if (existente?.id) {
        const { error } = await supabase
          .from("diagnosticos")
          .update({
            hallazgos,
            procedimiento,
            repuestos,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existente.id);

        if (error) {
          alert(error.message);
          return;
        }
      } else {
        const { error } = await supabase.from("diagnosticos").insert({
          orden_id: equipoId,
          hallazgos,
          procedimiento,
          repuestos,
        });

        if (error) {
          alert(error.message);
          return;
        }
      }
    }

    if (preservarEstadoActual) {
      alert("Checklist y diagnóstico actualizados sin cambiar la etapa actual de la OT.");
      await cargarDatos(true);
      return;
    }

    const datosRevisionEquipo: Record<string, any> = {
      estado: "Diagnóstico",
    };

    if (payload?.diagnosticoIASenior) {
      datosRevisionEquipo.diagnostico_ia_json = payload.diagnosticoIASenior;
      datosRevisionEquipo.diagnostico_ia_fuente = payload?.fuenteIA || "openai";
      datosRevisionEquipo.diagnostico_ia_generado_en = new Date().toISOString();
    }

    const { error: errorEstadoEquipo } = await supabase
      .from("ordenes")
      .update(datosRevisionEquipo)
      .eq("id", equipoId);

    if (errorEstadoEquipo) {
      alert(errorEstadoEquipo.message);
      return;
    }

    if (equipoId !== orden.id) {
      const { error: errorEstadoOrden } = await supabase
        .from("ordenes")
        .update({ estado: "Diagnóstico" })
        .eq("id", orden.id);

      if (errorEstadoOrden) {
        alert(errorEstadoOrden.message);
        return;
      }
    }

    setOrden((prev) => {
      if (!prev) return prev;
      return { ...prev, estado: "Diagnóstico" };
    });

    setEquiposLote((prev) =>
      prev.map((equipo) =>
        equipo.id === equipoId
          ? { ...equipo, estado: "Diagnóstico" }
          : equipo,
      ),
    );

    setTab("diagnostico");
    await cargarDatos();
  }

    async function notificarClienteEntrega() {
    if (!orden) return;

    if (!orden.cliente_email) {
      alert("Esta OT no tiene email de cliente registrado.");
      return;
    }

    setNotificandoCliente(true);

    try {
      const respuesta = await fetch("/api/enviar-correo-equipo-listo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: orden.cliente_email,
          cliente: orden.cliente,
          codigo: orden.codigo,
          producto: orden.equipo,
          ordenId: orden.id,
        }),
      });

      const data = await respuesta.json();

      if (!respuesta.ok || !data?.success) {
        alert(
          data?.error ||
            "No se pudo enviar el correo de notificación al cliente."
        );
        return;
      }

      alert("Cliente notificado correctamente.");
    } catch (error: any) {
      alert(error?.message || "No se pudo enviar el correo al cliente.");
    } finally {
      setNotificandoCliente(false);
    }
  }

  async function crearSolicitudLogistica() {
    if (!orden) return;

    if (!formularioLogistica.fecha) {
      alert("Debes seleccionar una fecha tentativa.");
      return;
    }

    if (
      formularioLogistica.tipo === "despacho" &&
      !formularioLogistica.direccion.trim()
    ) {
      alert("Para despacho debes ingresar dirección.");
      return;
    }

    setCreandoSolicitudLogistica(true);

    const esRetiro = formularioLogistica.tipo === "retiro";
    const ordenExtendida = orden as any;

    const payload = {
      tipo: formularioLogistica.tipo,
      estado: "solicitado",
      fecha: formularioLogistica.fecha,
      hora: formularioLogistica.hora || null,
      cliente: orden.cliente || null,
      contacto:
        ordenExtendida.contacto ||
        ordenExtendida.nombre_contacto ||
        orden.cliente ||
        null,
      telefono:
        ordenExtendida.telefono ||
        ordenExtendida.cliente_telefono ||
        ordenExtendida.celular ||
        null,
      email: orden.cliente_email || null,
      direccion: formularioLogistica.direccion.trim() || null,
      comuna: formularioLogistica.comuna.trim() || null,
      region: "Región Metropolitana",
      observacion:
        formularioLogistica.observacion.trim() ||
        (esRetiro
          ? "Cliente retira equipo en taller MJ Industrial."
          : "Despacho solicitado desde Servicio Técnico."),
      orden_id: orden.id,
      codigo_ot: orden.codigo,
      origen: "servicio_tecnico",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("agenda_logistica")
      .insert(payload)
      .select(
        "id,tipo,estado,fecha,hora,cliente,direccion,comuna,observacion,codigo_ot",
      )
      .single();

    setCreandoSolicitudLogistica(false);

    if (error) {
      alert(error.message || "No se pudo crear la solicitud logística.");
      return;
    }

    setEventoLogistica((data as EventoLogisticaOT) || null);
    alert("Solicitud creada en la agenda logística.");
  }

  if (loading) {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        Cargando orden...
      </main>
    );
  }

  if (error || !orden) {
    return (
      <main style={{ padding: 32, fontFamily: "Arial, sans-serif" }}>
        {error || "Orden no encontrada"}
      </main>
    );
  }

  const estadoBadge = badgeEstado(estadoActual);

  return (
    <>
      <main className="page">
        <div className="container">
          <HeaderOT
            codigo={orden.codigo}
            estado={estadoActual}
            prioridad={orden.prioridad}
            fecha={orden.created_at}
            estadoBadge={estadoBadge}
            generandoPdf={generandoPdf}
            onGenerarPDF={generarPDF}
          />

          <TimelineOT etapas={ETAPAS} etapaActualIndex={etapaActualIndex} />

          <TabsOT
            tab={tab}
            onChange={(nuevaTab) => cambiarTabSeguro(nuevaTab as TabOT)}
          />

          {tab === "detalle" && (
            <>
              {etapaActualIndex > 0 && (
                <ControlEtapaGuardada
                  titulo="Ingreso"
                  enEdicion={etapaEnEdicion("ingreso")}
                  onCambiar={() => alternarEdicionEtapa("ingreso")}
                />
              )}

              <section className="twoColumns">
                <DetalleCliente
                  ordenId={orden.id}
                  cliente={orden.cliente}
                  email={orden.cliente_email}
                  supabase={supabase}
                  onActualizar={(datos: any) => {
                    setOrden((prev: any) => {
                      if (!prev) return prev;
                      return { ...prev, ...datos };
                    });
                  }}
                />

                <DetalleEquipo
                  orden={orden as any}
                  supabase={supabase}
                  onActualizar={(actualizada: any) => {
                    setOrden((prev) => {
                      if (!prev) return prev;
                      return { ...prev, ...actualizada };
                    });
                  }}
                />
              </section>

              {esOtMadreLote && <EquiposLote equipos={equiposLote} />}

              {!esOtMadreLote && (
                <>
                  <ProblemaOT
                    ordenId={orden.id}
                    problema={orden.problema_reportado}
                    observaciones={orden.observaciones_iniciales}
                    supabase={supabase}
                    onActualizar={(datos: any) => {
                      setOrden((prev: any) => {
                        if (!prev) return prev;
                        return { ...prev, ...datos };
                      });
                    }}
                  />

                  <ChecklistIngreso
                    ordenId={orden.id}
                    soloLectura={
                      etapaActualIndex > 0 && !etapaEnEdicion("ingreso")
                    }
                  />

                  {etapaActualIndex === 0 && (
                    <div className="ingresoActions">
                      <button
                        type="button"
                        className="guardarIngreso"
                        onClick={guardarIngresoYAvanzar}
                      >
                        Guardar ingreso y avanzar a Checklist
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "checklist" && (
            <>
              {etapaActualIndex > 1 && (
                <ControlEtapaGuardada
                  titulo="Checklist"
                  enEdicion={etapaEnEdicion("checklist")}
                  onCambiar={() => alternarEdicionEtapa("checklist")}
                />
              )}

              {esOtMadreLote ? (
                <div
                  className={
                    etapaActualIndex > 1 && !etapaEnEdicion("checklist")
                      ? "stageReadOnly"
                      : ""
                  }
                >
                  <ChecklistLote equipos={equiposLote} ordenId={orden.id} />
                </div>
              ) : esEquipoEspecial(orden.equipo) ? (
                <ChecklistEspecial
                  ordenId={orden.id}
                  nombreEquipo={orden.equipo}
                  problemaReportado={orden.problema_reportado}
                  soloLectura={
                    etapaActualIndex > 1 && !etapaEnEdicion("checklist")
                  }
                  edicionHistorica={etapaActualIndex > 1}
                  onGenerarDiagnostico={avanzarADiagnostico}
                />
              ) : (
                <ChecklistInteligente
                  equipoId={orden.id}
                  tipoEquipoInicial={orden.equipo}
                  soloLectura={
                    etapaActualIndex > 1 && !etapaEnEdicion("checklist")
                  }
                  edicionHistorica={etapaActualIndex > 1}
                  onGenerarDiagnostico={avanzarADiagnostico}
                />
              )}
            </>
          )}

          {tab === "diagnostico" && (
            <>
              {etapaActualIndex > 2 && (
                <ControlEtapaGuardada
                  titulo="Diagnóstico"
                  enEdicion={etapaEnEdicion("diagnostico")}
                  onCambiar={() => alternarEdicionEtapa("diagnostico")}
                />
              )}

              <DiagnosticoTecnico
                ordenId={orden.id}
                soloLectura={
                  etapaActualIndex > 2 && !etapaEnEdicion("diagnostico")
                }
                edicionHistorica={etapaActualIndex > 2}
                onEstadoActualizado={(estado) => {
                  setOrden((prev) => {
                    if (!prev) return prev;
                    return { ...prev, estado };
                  });
                  setTab(tabDesdeEstado(estado));
                }}
              />
            </>
          )}

          {tab === "revision" && (
            <>
              {etapaActualIndex > 3 && (
                <ControlEtapaGuardada
                  titulo="Revisión"
                  enEdicion={etapaEnEdicion("revision")}
                  onCambiar={() => alternarEdicionEtapa("revision")}
                />
              )}

              <RevisionJefe
                ordenId={orden.id}
                soloLectura={
                  etapaActualIndex > 3 && !etapaEnEdicion("revision")
                }
                edicionHistorica={etapaActualIndex > 3}
                onEstadoActualizado={(estado) => {
                  setOrden((prev) => {
                    if (!prev) return prev;
                    return { ...prev, estado };
                  });
                  setTab(tabDesdeEstado(estado));
                }}
              />
            </>
          )}

          {tab === "cotizacion" && (
            <>
              {etapaActualIndex > 4 && (
                <ControlEtapaGuardada
                  titulo="Cotización interna"
                  enEdicion={etapaEnEdicion("cotizacion")}
                  onCambiar={() => alternarEdicionEtapa("cotizacion")}
                />
              )}

              <CotizacionInterna
                ordenId={orden.id}
                soloLectura={
                  etapaActualIndex > 4 && !etapaEnEdicion("cotizacion")
                }
                edicionHistorica={etapaActualIndex > 4}
                onEstadoActualizado={(estado) => {
                  setOrden((prev) => {
                    if (!prev) return prev;
                    return { ...prev, estado };
                  });

                  setEquiposLote((prev) =>
                    prev.map((equipo) => ({
                      ...equipo,
                      estado,
                    })),
                  );

                  setTab(tabDesdeEstado(estado));
                }}
              />
            </>
          )}

          {tab === "trabajo" && (
            <>
              {etapaActualIndex > 5 && (
                <ControlEtapaGuardada
                  titulo="Trabajo"
                  enEdicion={etapaEnEdicion("trabajo")}
                  onCambiar={() => alternarEdicionEtapa("trabajo")}
                />
              )}

              {estadoActual === "Listo" || estadoActual === "Entregado" ? (
                <>
                  <TrabajoOT
                    ordenId={orden.id}
                    soloLectura={
                      etapaActualIndex > 5 && !etapaEnEdicion("trabajo")
                    }
                    edicionHistorica={etapaActualIndex > 5}
                  />

                  <section className="listoCard">
                <div className="listoHeader">
                  <div>
                    <span className="listoEyebrow">Etapa Listo</span>
                    <h2>Coordinar entrega / despacho</h2>
                    <p>
                      El trabajo técnico ya terminó. Ahora se debe agendar el
                      retiro en taller o el despacho al cliente. La OT pasará a
                      Entregado solo cuando logística marque la solicitud como
                      realizada.
                    </p>
                  </div>

                  <div className="listoAcciones">
  <span className="listoBadge">
    {eventoLogistica
      ? etiquetaEstadoLogistica(eventoLogistica.estado)
      : "Pendiente coordinación"}
  </span>

  <button
    type="button"
    className="notificarCliente"
    onClick={notificarClienteEntrega}
    disabled={notificandoCliente || !orden.cliente_email}
  >
    {notificandoCliente ? "Enviando..." : "Notificar cliente"}
  </button>
</div>
                </div>

                {eventoLogistica ? (
                  <div className="eventoCreado">
                    <h3>Solicitud logística creada</h3>
                    <div className="eventoGrid">
                      <div>
                        <span>Tipo</span>
                        <strong>
                          {eventoLogistica.tipo === "retiro"
                            ? "Cliente retira en taller"
                            : "Despacho a cliente"}
                        </strong>
                      </div>

                      <div>
                        <span>Estado</span>
                        <strong>
                          {etiquetaEstadoLogistica(eventoLogistica.estado)}
                        </strong>
                      </div>

                      <div>
                        <span>Fecha</span>
                        <strong>{formatearFechaCL(eventoLogistica.fecha)}</strong>
                      </div>

                      <div>
                        <span>Hora</span>
                        <strong>{formatearHoraCL(eventoLogistica.hora)}</strong>
                      </div>
                    </div>

                    <p>
                      {[eventoLogistica.direccion, eventoLogistica.comuna]
                        .filter(Boolean)
                        .join(", ") || "Sin dirección registrada"}
                    </p>

                    {eventoLogistica.observacion && (
                      <p className="eventoObservacion">
                        {eventoLogistica.observacion}
                      </p>
                    )}

                    {eventoLogistica.estado !== "realizado" && (
                      <p className="notaLogistica">
                        Para cerrar la OT como entregada, logística debe marcar
                        este retiro/despacho como realizado en la Agenda
                        Operativa.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="formLogistica">
                    <div className="tipoEntrega">
                      <button
                        type="button"
                        className={
                          formularioLogistica.tipo === "retiro" ? "activo" : ""
                        }
                        onClick={() =>
                          setFormularioLogistica((prev) => ({
                            ...prev,
                            tipo: "retiro",
                            direccion:
                              prev.direccion || "Taller MJ Industrial",
                            observacion:
                              prev.observacion ||
                              "Cliente retira equipo en taller MJ Industrial.",
                          }))
                        }
                      >
                        Cliente retira en taller
                      </button>

                      <button
                        type="button"
                        className={
                          formularioLogistica.tipo === "despacho" ? "activo" : ""
                        }
                        onClick={() =>
                          setFormularioLogistica((prev) => ({
                            ...prev,
                            tipo: "despacho",
                            direccion:
                              prev.direccion === "Taller MJ Industrial"
                                ? ""
                                : prev.direccion,
                            observacion:
                              prev.observacion ===
                              "Cliente retira equipo en taller MJ Industrial."
                                ? "Despacho solicitado desde Servicio Técnico."
                                : prev.observacion,
                          }))
                        }
                      >
                        Solicitar despacho a cliente
                      </button>
                    </div>

                    <div className="formGridLogistica">
                      <label>
                        Fecha tentativa
                        <input
                          type="date"
                          value={formularioLogistica.fecha}
                          onChange={(event) =>
                            setFormularioLogistica((prev) => ({
                              ...prev,
                              fecha: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label>
                        Hora tentativa
                        <input
                          type="time"
                          value={formularioLogistica.hora}
                          onChange={(event) =>
                            setFormularioLogistica((prev) => ({
                              ...prev,
                              hora: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label>
                        Dirección
                        <input
                          value={formularioLogistica.direccion}
                          onChange={(event) =>
                            setFormularioLogistica((prev) => ({
                              ...prev,
                              direccion: event.target.value,
                            }))
                          }
                          placeholder={
                            formularioLogistica.tipo === "retiro"
                              ? "Taller MJ Industrial"
                              : "Dirección de despacho"
                          }
                        />
                      </label>

                      <label>
                        Comuna
                        <input
                          value={formularioLogistica.comuna}
                          onChange={(event) =>
                            setFormularioLogistica((prev) => ({
                              ...prev,
                              comuna: event.target.value,
                            }))
                          }
                          placeholder="Comuna"
                        />
                      </label>

                      <label className="span2">
                        Observación logística
                        <textarea
                          value={formularioLogistica.observacion}
                          onChange={(event) =>
                            setFormularioLogistica((prev) => ({
                              ...prev,
                              observacion: event.target.value,
                            }))
                          }
                          rows={4}
                          placeholder="Indicar condiciones de retiro/despacho, contacto, horario, etc."
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="crearLogistica"
                      onClick={crearSolicitudLogistica}
                      disabled={creandoSolicitudLogistica}
                    >
                      {creandoSolicitudLogistica
                        ? "Creando solicitud..."
                        : "Crear solicitud en Agenda Logística"}
                    </button>
                  </div>
                )}
                  </section>
                </>
              ) : (
                <TrabajoOT
                  ordenId={orden.id}
                  soloLectura={
                    etapaActualIndex > 5 && !etapaEnEdicion("trabajo")
                  }
                  edicionHistorica={etapaActualIndex > 5}
                  onEstadoActualizado={(estado) => {
                    setOrden((prev) => {
                      if (!prev) return prev;
                      return { ...prev, estado };
                    });

                    const estadoNormalizado = normalizarEstado(estado);

                    if (estadoNormalizado === "Listo") {
                      setTab("trabajo");
                      void cargarDatos();
                    }
                  }}
                />
              )}
            </>
          )}

          {tab === "reportes" && (
            <>
              <FotosIngreso fotos={fotosIngreso} onOpen={setFotoModal} />

              <DocumentosIngreso documentos={documentosIngreso} />

              <Reportes
                ordenId={orden.id}
                reportes={reportesOrdenados}
                eliminandoFotoId={eliminandoFotoId}
                onOpenFoto={setFotoModal}
                onEliminarFoto={confirmarEliminarFoto}
              />
            </>
          )}
        </div>
      </main>

      <ModalFoto foto={fotoModal} cerrar={() => setFotoModal(null)} />

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f8fafc;
          padding: 28px 32px 60px;
          font-family: Arial, sans-serif;
        }

        .container {
          max-width: 1100px;
          margin: 0 auto;
        }

        .twoColumns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        .stageReadOnly {
          pointer-events: none;
          opacity: 0.88;
        }

        .listoCard {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .listoHeader {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .listoEyebrow {
          display: block;
          color: #2563eb;
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .listoHeader h2 {
          margin: 0;
          color: #0f172a;
          font-size: 22px;
        }

        .listoHeader p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 14px;
          line-height: 1.45;
          max-width: 680px;
        }

        .listoBadge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: #dcfce7;
          color: #15803d;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

                .listoAcciones {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .notificarCliente {
          border: none;
          background: #2563eb;
          color: white;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 900;
          cursor: pointer;
          font-size: 13px;
          white-space: nowrap;
        }

        .notificarCliente:hover {
          background: #1d4ed8;
        }

        .notificarCliente:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .eventoCreado {
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          border-radius: 16px;
          padding: 16px;
        }

        .eventoCreado h3 {
          margin: 0 0 12px;
          color: #14532d;
          font-size: 18px;
        }

        .eventoGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 12px;
        }

        .eventoGrid div {
          background: white;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 10px;
        }

        .eventoGrid span {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .eventoGrid strong {
          display: block;
          color: #0f172a;
          font-size: 14px;
        }

        .eventoCreado p {
          margin: 8px 0 0;
          color: #334155;
          font-size: 14px;
          line-height: 1.45;
        }

        .eventoObservacion {
          background: white;
          border-radius: 10px;
          padding: 10px;
        }

        .notaLogistica {
          color: #166534 !important;
          font-weight: 800;
        }

        .formLogistica {
          display: grid;
          gap: 16px;
        }

        .tipoEntrega {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .tipoEntrega button {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #334155;
          border-radius: 14px;
          padding: 14px;
          font-weight: 900;
          cursor: pointer;
        }

        .tipoEntrega button.activo {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        .formGridLogistica {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .formGridLogistica label {
          display: grid;
          gap: 6px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .formGridLogistica input,
        .formGridLogistica textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 10px;
          font-size: 14px;
          font-family: inherit;
        }

        .span2 {
          grid-column: span 2;
        }

        .crearLogistica {
          width: 100%;
          border: none;
          background: #16a34a;
          color: white;
          padding: 13px 16px;
          border-radius: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .crearLogistica:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .page {
            padding: 22px 14px 50px;
          }

                    .listoAcciones {
            align-items: flex-start;
          }

          .twoColumns,
          .eventoGrid,
          .tipoEntrega,
          .formGridLogistica {
            grid-template-columns: 1fr;
          }

          .listoHeader {
            flex-direction: column;
          }

          .span2 {
            grid-column: span 1;
          }
        }
        .ingresoActions {
          display: flex;
          justify-content: flex-end;
          margin-top: 16px;
        }

        .guardarIngreso {
          border: none;
          background: #2563eb;
          color: white;
          padding: 12px 18px;
          border-radius: 12px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
        }

        .guardarIngreso:hover {
          background: #1d4ed8;
        }

      `}</style>
    </>
  );
}