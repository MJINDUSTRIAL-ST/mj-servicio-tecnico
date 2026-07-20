"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type EstadoCliente =
  | "Ingreso"
  | "Diagnóstico"
  | "Cotización"
  | "Aprobada"
  | "Rechazada"
  | "En reparación"
  | "Listo para entrega"
  | "Entregado";

type EtapaVisualKey =
  | "Ingreso"
  | "Diagnóstico"
  | "Cotización"
  | "Resultado"
  | "Trabajo"
  | "Listo"
  | "Entregado";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: string;
  prioridad: string | null;
  created_at: string | null;
  cliente_email: string | null;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  accesorios_entregados: string | null;
  problema_reportado: string | null;
  observaciones_iniciales: string | null;
  fotos_estado_inicial: string | string[] | null;
};

type Diagnostico = {
  id?: string;
  orden_id?: string;
  hallazgos?: string | null;
  procedimiento?: string | null;
  repuestos?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ChecklistFoto = {
  id: string;
  item_id?: string | null;
  item_label?: string | null;
  nombre?: string | null;
  url?: string | null;
  observacion?: string | null;
  created_at?: string | null;
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
  foto_url: string;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type Reporte = {
  id: string;
  orden_id: string;
  etapa: string;
  descripcion: string | null;
  hallazgos: string | null;
  acciones: string | null;
  costo: number | null;
  created_at: string;
  reporte_fotos?: ReporteFoto[];
};

type ClientePortal = {
  id: string;
};

type TipoEntregaCliente = "retiro_taller" | "despacho";

type SolicitudLogistica = {
  id: string;
  tipo: "retiro" | "retiro_taller" | "despacho";
  estado: "solicitado" | "agendado" | "en_ruta" | "realizado" | "cancelado";
  fecha: string;
  hora: string | null;
  cliente: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  comuna: string | null;
  region: string | null;
  observacion: string | null;
  orden_id: string | null;
  codigo_ot: string | null;
  origen: string | null;
  recibido_por: string | null;
  entrega_foto_url: string | null;
  entrega_foto_path: string | null;
  entrega_observacion: string | null;
  entregado_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const indicePorEstado: Record<EstadoCliente, number> = {
  Ingreso: 0,
  Diagnóstico: 1,
  Cotización: 2,
  Aprobada: 3,
  Rechazada: 3,
  "En reparación": 4,
  "Listo para entrega": 5,
  Entregado: 6,
};

function crearEtapasVisuales(estadoActual: EstadoCliente) {
  let etiquetaResultado = "Aprobada / Rechazada";

  if (estadoActual === "Rechazada") {
    etiquetaResultado = "Rechazada";
  }

  if (
    estadoActual === "Aprobada" ||
    estadoActual === "En reparación" ||
    estadoActual === "Listo para entrega" ||
    estadoActual === "Entregado"
  ) {
    etiquetaResultado = "Aprobada";
  }

  return [
    {
      key: "Ingreso" as EtapaVisualKey,
      label: "Ingreso",
      numero: "1",
      index: 0,
    },
    {
      key: "Diagnóstico" as EtapaVisualKey,
      label: "Diagnóstico",
      numero: "2",
      index: 1,
    },
    {
      key: "Cotización" as EtapaVisualKey,
      label: "Cotización",
      numero: "3",
      index: 2,
    },
    {
      key: "Resultado" as EtapaVisualKey,
      label: etiquetaResultado,
      numero: "4",
      index: 3,
    },
    {
      key: "Trabajo" as EtapaVisualKey,
      label: "En reparación / Trabajo",
      numero: "5",
      index: 4,
    },
    {
      key: "Listo" as EtapaVisualKey,
      label: "Listo para entrega",
      numero: "6",
      index: 5,
    },
    {
      key: "Entregado" as EtapaVisualKey,
      label: "Entregado",
      numero: "7",
      index: 6,
    },
  ].map((etapa) => ({
    ...etapa,
    completada: etapa.index < indicePorEstado[estadoActual],
    activa: etapa.index === indicePorEstado[estadoActual],
  }));
}

function normalizarEstadoCliente(estado?: string | null): EstadoCliente {
  if (!estado) return "Ingreso";

  const e = estado
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (e.includes("entregado")) return "Entregado";
  if (e.includes("listo")) return "Listo para entrega";
  if (e.includes("rechaz")) return "Rechazada";
  if (e.includes("aprob")) return "Aprobada";

  if (
    e.includes("trabajo") ||
    e.includes("mantenimiento") ||
    e.includes("mant.") ||
    e.includes("reparacion") ||
    e.includes("repar.")
  ) {
    return "En reparación";
  }

  if (e.includes("cotizacion") || e.includes("comercial")) {
    return "Cotización";
  }

  if (
    e.includes("diagnostico") ||
    e.includes("checklist") ||
    e.includes("revision") ||
    e.includes("jefe")
  ) {
    return "Diagnóstico";
  }

  if (e.includes("ingreso") || e.includes("ingresada")) return "Ingreso";

  return "Ingreso";
}

function normalizarFotos(fotos: string | string[] | null) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) return fotos.filter(Boolean);

  try {
    const parsed = JSON.parse(fotos);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {}

  return fotos
    .split(",")
    .map((foto) => foto.trim())
    .filter(Boolean);
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL");
  } catch {
    return fecha;
  }
}

function formatMoneda(valor?: number | null) {
  if (valor == null) return "";

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
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
  return escaparHtml(valor || "-").replace(/\n/g, "<br />");
}

function getCircleClass({
  completada,
  activa,
  estadoActual,
  etapaKey,
}: {
  completada: boolean;
  activa: boolean;
  estadoActual: EstadoCliente;
  etapaKey: EtapaVisualKey;
}) {
  if (activa && estadoActual === "Rechazada" && etapaKey === "Resultado") {
    return "bg-red-600 text-white border-red-600";
  }

  if (completada) return "bg-blue-100 text-blue-700 border-blue-200";
  if (activa) return "bg-blue-600 text-white border-blue-600";

  return "bg-slate-100 text-slate-400 border-slate-200";
}

function getTextClass({
  completada,
  activa,
  estadoActual,
  etapaKey,
}: {
  completada: boolean;
  activa: boolean;
  estadoActual: EstadoCliente;
  etapaKey: EtapaVisualKey;
}) {
  if (activa && estadoActual === "Rechazada" && etapaKey === "Resultado") {
    return "text-red-700 font-semibold";
  }

  if (completada) return "text-blue-600";
  if (activa) return "text-blue-700 font-semibold";

  return "text-slate-400";
}

function getLineClass(index: number, estadoActual: EstadoCliente) {
  const actual = indicePorEstado[estadoActual];

  if (estadoActual === "Rechazada" && index < actual) {
    return "bg-red-500";
  }

  return index < actual ? "bg-blue-500" : "bg-slate-200";
}

function getBadgeClass(estado: EstadoCliente): string {
  switch (estado) {
    case "Entregado":
      return "bg-slate-900 text-white";
    case "Listo para entrega":
      return "bg-emerald-50 text-emerald-800";
    case "En reparación":
      return "bg-orange-50 text-orange-800";
    case "Rechazada":
      return "bg-red-50 text-red-800";
    case "Aprobada":
      return "bg-green-50 text-green-800";
    case "Cotización":
      return "bg-yellow-50 text-yellow-800";
    case "Diagnóstico":
      return "bg-blue-50 text-blue-800";
    case "Ingreso":
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function estadoCotizacion(estado: EstadoCliente) {
  if (estado === "Rechazada") return "Rechazada";

  if (
    estado === "Aprobada" ||
    estado === "En reparación" ||
    estado === "Listo para entrega" ||
    estado === "Entregado"
  ) {
    return "Aprobada";
  }

  if (estado === "Cotización") return "Pendiente de aprobación";

  return "Pendiente";
}

function puedeDescargarFinal(estado: EstadoCliente) {
  return (
    estado === "En reparación" ||
    estado === "Listo para entrega" ||
    estado === "Entregado"
  );
}

function fechaHoyISO() {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, "0");
  const day = String(hoy.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatFechaCorta(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function etiquetaEstadoLogistica(estado?: SolicitudLogistica["estado"] | null) {
  if (estado === "solicitado") return "Solicitado";
  if (estado === "agendado") return "Agendado";
  if (estado === "en_ruta") return "En ruta";
  if (estado === "realizado") return "Realizado";
  if (estado === "cancelado") return "Cancelado";

  return "Pendiente";
}

function bloqueRetiroDesdeHora(hora?: string | null) {
  if (!hora) return "Sin bloque registrado";

  if (hora.startsWith("10:")) return "10:00 a 12:30 hrs.";
  if (hora.startsWith("15:")) return "15:00 a 17:00 hrs.";

  return hora;
}

function renderFotosPDF(
  titulo: string,
  fotos: Array<{ url: string; nombre?: string | null; detalle?: string | null }>
) {
  const fotosValidas = fotos.filter((foto) => Boolean(foto.url));

  if (fotosValidas.length === 0) return "";

  return `
    <section class="section">
      <h3>${escaparHtml(titulo)}</h3>
      <div class="photoGrid">
        ${fotosValidas
          .map(
            (foto, index) => `
              <a class="photoCard" href="${escaparHtml(
                foto.url
              )}" target="_blank" rel="noopener noreferrer">
                <img src="${escaparHtml(foto.url)}" alt="${escaparHtml(
                  foto.nombre || `Foto ${index + 1}`
                )}" />
                <span>${escaparHtml(foto.nombre || `Foto ${index + 1}`)}</span>
                ${
                  foto.detalle
                    ? `<small>${escaparHtml(foto.detalle)}</small>`
                    : ""
                }
              </a>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export default function DetalleServicioClientePage() {
  const params = useParams();
  const ordenId = Array.isArray(params.orden) ? params.orden[0] : params.orden;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [diagnostico, setDiagnostico] = useState<Diagnostico | null>(null);
  const [checklistFotos, setChecklistFotos] = useState<ChecklistFoto[]>([]);
  const [documentosIngreso, setDocumentosIngreso] = useState<OrdenDocumento[]>(
    []
  );
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const [solicitudLogistica, setSolicitudLogistica] =
    useState<SolicitudLogistica | null>(null);
  const [modalidadEntrega, setModalidadEntrega] =
    useState<TipoEntregaCliente | null>(null);
  const [fechaRetiro, setFechaRetiro] = useState(fechaHoyISO());
  const [bloqueRetiro, setBloqueRetiro] = useState<"10:00" | "15:00">("10:00");
  const [direccionDespacho, setDireccionDespacho] = useState("");
  const [comunaDespacho, setComunaDespacho] = useState("");
  const [regionDespacho, setRegionDespacho] = useState("");
  const [contactoDespacho, setContactoDespacho] = useState("");
  const [telefonoDespacho, setTelefonoDespacho] = useState("");
  const [observacionEntrega, setObservacionEntrega] = useState("");
  const [guardandoEntrega, setGuardandoEntrega] = useState(false);

  const estadoCliente = useMemo(() => {
    return normalizarEstadoCliente(orden?.estado);
  }, [orden?.estado]);

  const etapasVisuales = useMemo(() => {
    return crearEtapasVisuales(estadoCliente);
  }, [estadoCliente]);

  const fotosIngreso = useMemo(() => {
    return normalizarFotos(orden?.fotos_estado_inicial || null);
  }, [orden?.fotos_estado_inicial]);

  const cotizacionEstado = useMemo(() => {
    return estadoCotizacion(estadoCliente);
  }, [estadoCliente]);

  const entregaCompletada = useMemo(() => {
    return Boolean(
      solicitudLogistica &&
        (solicitudLogistica.estado === "realizado" ||
          solicitudLogistica.entregado_at ||
          solicitudLogistica.entrega_foto_url ||
          solicitudLogistica.recibido_por)
    );
  }, [solicitudLogistica]);

  useEffect(() => {
    cargarOrden();
  }, [ordenId]);

  async function cargarOrden() {
    setLoading(true);
    setError("");

    const email = localStorage.getItem("cliente_email")?.trim().toLowerCase();

    if (!email) {
      setError("No hay sesión activa");
      setLoading(false);
      return;
    }

    const { data: ordenDirecta } = await supabase
      .from("ordenes")
      .select("*")
      .eq("id", ordenId)
      .eq("cliente_email", email)
      .maybeSingle();

    let ordenAutorizada = ordenDirecta as Orden | null;

    if (!ordenAutorizada) {
      const { data: clienteActual } = await supabase
        .from("clientes")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      const clientePortal = clienteActual as ClientePortal | null;

      if (clientePortal?.id) {
        const { data: acceso } = await supabase
          .from("orden_clientes_acceso")
          .select("id")
          .eq("orden_id", ordenId)
          .eq("cliente_id", clientePortal.id)
          .maybeSingle();

        if (acceso?.id) {
          const { data: ordenPorAcceso } = await supabase
            .from("ordenes")
            .select("*")
            .eq("id", ordenId)
            .maybeSingle();

          ordenAutorizada = ordenPorAcceso as Orden | null;
        }
      }
    }

    if (!ordenAutorizada) {
      setError("Orden no encontrada o sin permiso de acceso");
      setLoading(false);
      return;
    }

    const [
      { data: diagnosticoData },
      { data: checklistFotosData },
      { data: documentosData },
      { data: reportesData, error: reportesError },
      {
        data: solicitudLogisticaData,
        error: solicitudLogisticaError,
      },
    ] = await Promise.all([
      supabase
        .from("diagnosticos")
        .select("*")
        .eq("orden_id", ordenAutorizada.id)
        .maybeSingle(),

      supabase
        .from("checklist_fotos")
        .select("id,item_id,item_label,nombre,url,observacion,created_at")
        .eq("orden_id", ordenAutorizada.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("orden_documentos")
        .select("*")
        .eq("orden_id", ordenAutorizada.id)
        .order("created_at", { ascending: true }),

      supabase
        .from("reportes")
        .select(
          `
          *,
          reporte_fotos (
            id,
            foto_url,
            comentario,
            orden,
            es_principal
          )
        `
        )
        .eq("orden_id", ordenAutorizada.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("agenda_logistica")
        .select("*")
        .eq("orden_id", ordenAutorizada.id)
        .in("tipo", ["retiro", "retiro_taller", "despacho"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (reportesError) {
      setError(reportesError.message);
      setLoading(false);
      return;
    }

    if (solicitudLogisticaError) {
      console.error(
        "No se pudo cargar la solicitud de retiro o despacho:",
        solicitudLogisticaError
      );
    }

    const reportesOrdenados = ((reportesData || []) as Reporte[]).map(
      (reporte) => ({
        ...reporte,
        reporte_fotos: [...(reporte.reporte_fotos || [])].sort((a, b) => {
          const ordenA = a.orden ?? 0;
          const ordenB = b.orden ?? 0;
          return ordenA - ordenB;
        }),
      })
    );

    setOrden(ordenAutorizada);
    setDiagnostico((diagnosticoData as Diagnostico) || null);
    setChecklistFotos((checklistFotosData || []) as ChecklistFoto[]);
    setDocumentosIngreso((documentosData || []) as OrdenDocumento[]);
    setReportes(reportesOrdenados);
    setSolicitudLogistica(
      (solicitudLogisticaData as SolicitudLogistica | null) || null
    );
    setLoading(false);
  }

  async function guardarSolicitudEntrega() {
    if (!orden || guardandoEntrega || solicitudLogistica) return;

    if (!modalidadEntrega) {
      alert("Selecciona retiro en taller o solicitar despacho.");
      return;
    }

    if (modalidadEntrega === "retiro_taller" && !fechaRetiro) {
      alert("Selecciona la fecha de retiro.");
      return;
    }

    if (modalidadEntrega === "despacho") {
      if (!direccionDespacho.trim()) {
        alert("Ingresa la dirección de despacho.");
        return;
      }

      if (!comunaDespacho.trim()) {
        alert("Ingresa la comuna.");
        return;
      }

      if (!contactoDespacho.trim()) {
        alert("Ingresa la persona de contacto.");
        return;
      }

      if (!telefonoDespacho.trim()) {
        alert("Ingresa el teléfono de contacto.");
        return;
      }
    }

    setGuardandoEntrega(true);

    try {
      const { data: solicitudExistente, error: errorValidacion } = await supabase
        .from("agenda_logistica")
        .select("*")
        .eq("orden_id", orden.id)
        .in("tipo", ["retiro", "retiro_taller", "despacho"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errorValidacion) {
        throw errorValidacion;
      }

      if (solicitudExistente) {
        setSolicitudLogistica(solicitudExistente as SolicitudLogistica);
        alert("Esta orden ya tiene una solicitud de retiro o despacho registrada.");
        return;
      }

      const esRetiro = modalidadEntrega === "retiro_taller";
      const bloqueCompleto =
        bloqueRetiro === "10:00"
          ? "10:00 a 12:30 hrs."
          : "15:00 a 17:00 hrs.";

      const observaciones = [
        esRetiro
          ? `Retiro en taller solicitado por el cliente. Bloque: ${bloqueCompleto}`
          : "Despacho solicitado por el cliente. Pendiente de coordinación logística.",
        observacionEntrega.trim() || null,
      ]
        .filter(Boolean)
        .join("\n");

      const payload = {
        tipo: modalidadEntrega,
        estado: esRetiro ? "agendado" : "solicitado",
        fecha: esRetiro ? fechaRetiro : fechaHoyISO(),
        hora: esRetiro ? bloqueRetiro : null,
        cliente: orden.cliente || null,
        contacto: esRetiro
          ? orden.cliente || null
          : contactoDespacho.trim(),
        telefono: esRetiro ? null : telefonoDespacho.trim(),
        email: orden.cliente_email || null,
        direccion: esRetiro
          ? "Taller MJ Industrial"
          : direccionDespacho.trim(),
        comuna: esRetiro ? "Taller MJ" : comunaDespacho.trim(),
        region: esRetiro
          ? "Región Metropolitana"
          : regionDespacho.trim() || null,
        observacion: observaciones || null,
        orden_id: orden.id,
        codigo_ot: orden.codigo || null,
        origen: "servicio_tecnico",
        updated_at: new Date().toISOString(),
      };

      const { data, error: errorInsert } = await supabase
        .from("agenda_logistica")
        .insert(payload)
        .select("*")
        .single();

      if (errorInsert) {
        throw errorInsert;
      }

      setSolicitudLogistica(data as SolicitudLogistica);
      setModalidadEntrega(null);

      alert(
        esRetiro
          ? "Retiro en taller agendado correctamente."
          : "Solicitud de despacho enviada correctamente."
      );
    } catch (errorSolicitud) {
      console.error(errorSolicitud);

      const mensaje =
        errorSolicitud instanceof Error
          ? errorSolicitud.message
          : "No se pudo registrar la solicitud.";

      alert(mensaje);
    } finally {
      setGuardandoEntrega(false);
    }
  }

  function generarPDF(tipo: "diagnostico" | "final") {
    if (!orden) return;

    setGenerandoPdf(true);

    try {
      const logoUrl = `${window.location.origin}/logo-informe.png`;
      const fechaEmision = new Date().toLocaleDateString("es-CL");
      const titulo =
        tipo === "diagnostico"
          ? "INFORME TÉCNICO DIAGNÓSTICO"
          : "INFORME TÉCNICO FINAL";

      const fotosIngresoPDF = fotosIngreso.map((url, index) => ({
        url,
        nombre: `Foto ingreso ${index + 1}`,
      }));

      const fotosChecklistPDF = checklistFotos
        .filter((foto) => Boolean(foto.url))
        .map((foto, index) => ({
          url: foto.url || "",
          nombre:
            foto.item_label || foto.nombre || `Foto diagnóstico ${index + 1}`,
          detalle: foto.observacion,
        }));

      const fotosReportesPDF = reportes.flatMap((reporte) =>
        (reporte.reporte_fotos || []).map((foto, index) => ({
          url: foto.foto_url,
          nombre:
            foto.comentario ||
            `${reporte.etapa || "Reporte"} - Foto ${index + 1}`,
          detalle: reporte.etapa,
        }))
      );

      const fotosEntregaPDF = solicitudLogistica?.entrega_foto_url
        ? [
            {
              url: solicitudLogistica.entrega_foto_url,
              nombre: "Evidencia de entrega",
              detalle: solicitudLogistica.recibido_por
                ? `Recibido por: ${solicitudLogistica.recibido_por}`
                : null,
            },
          ]
        : [];

      const ultimoReporte = reportes[0];

      const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escaparHtml(titulo)} ${escaparHtml(orden.codigo)}</title>
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
    .logo { width: 150px; height: auto; object-fit: contain; }
    h1 {
      margin: 12px 0 0;
      color: #1e3a8a;
      font-size: 22px;
      letter-spacing: 0.06em;
    }
    .meta {
      text-align: right;
      line-height: 1.45;
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
      background: #dbeafe;
      color: #1e40af;
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
      break-inside: avoid;
      page-break-inside: avoid;
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
    .footer {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 9px;
    }
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
      .section, .field, .photoCard { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="printBar" onclick="window.print()">Imprimir / Guardar PDF</div>
  <main class="page">
    <header class="top">
      <div>
        <img class="logo" src="${logoUrl}" alt="MJ Industrial" />
        <h1>${escaparHtml(titulo)}</h1>
      </div>
      <div class="meta">
        <strong>${escaparHtml(orden.codigo)}</strong>
        Estado: ${escaparHtml(estadoCliente)}<br />
        Fecha ingreso: ${escaparHtml(formatFecha(orden.created_at))}<br />
        Fecha emisión: ${escaparHtml(fechaEmision)}<br />
        <span class="status">${escaparHtml(estadoCliente)}</span>
      </div>
    </header>

    <section class="grid2">
      <div class="field"><span>Cliente</span><strong>${escaparHtml(
        orden.cliente
      )}</strong></div>
      <div class="field"><span>Email</span><strong>${escaparHtml(
        orden.cliente_email
      )}</strong></div>
      <div class="field"><span>Equipo</span><strong>${escaparHtml(
        orden.equipo
      )}</strong></div>
      <div class="field"><span>Prioridad</span><strong>${escaparHtml(
        orden.prioridad || "-"
      )}</strong></div>
    </section>

    <section class="section">
      <h3>Datos del equipo</h3>
      <div class="grid4">
        <div class="field"><span>Marca</span><strong>${escaparHtml(
          orden.marca || "-"
        )}</strong></div>
        <div class="field"><span>Modelo</span><strong>${escaparHtml(
          orden.modelo || "-"
        )}</strong></div>
        <div class="field"><span>Serie</span><strong>${escaparHtml(
          orden.numero_serie || "-"
        )}</strong></div>
        <div class="field"><span>Accesorios</span><strong>${escaparHtml(
          orden.accesorios_entregados || "-"
        )}</strong></div>
      </div>
    </section>

    <section class="section">
      <h3>Problema reportado al ingreso</h3>
      <p>${textoConSaltos(orden.problema_reportado || "-")}</p>
      <p style="margin-top:8px;"><strong>Observaciones iniciales:</strong><br />${textoConSaltos(
        orden.observaciones_iniciales || "-"
      )}</p>
    </section>

    ${renderFotosPDF("Fotos de ingreso", fotosIngresoPDF)}

    <section class="section">
      <h3>Diagnóstico técnico</h3>
      <p><strong>Hallazgos:</strong><br />${textoConSaltos(
        diagnostico?.hallazgos || "Sin diagnóstico registrado."
      )}</p>
      <p style="margin-top:8px;"><strong>Procedimiento recomendado:</strong><br />${textoConSaltos(
        diagnostico?.procedimiento || "-"
      )}</p>
      <p style="margin-top:8px;"><strong>Repuestos sugeridos:</strong><br />${textoConSaltos(
        diagnostico?.repuestos || "-"
      )}</p>
    </section>

    ${renderFotosPDF("Fotos del diagnóstico / checklist", fotosChecklistPDF)}

    ${
      tipo === "final"
        ? `<section class="section">
            <h3>Trabajo realizado / cierre operativo</h3>
            <p><strong>Descripción:</strong><br />${textoConSaltos(
              ultimoReporte?.descripcion || "Sin descripción final registrada."
            )}</p>
            <p style="margin-top:8px;"><strong>Hallazgos / acciones:</strong><br />${textoConSaltos(
              ultimoReporte?.acciones ||
                ultimoReporte?.hallazgos ||
                "Sin acciones finales registradas."
            )}</p>
          </section>
          ${renderFotosPDF("Fotos de trabajo / egreso", fotosReportesPDF)}`
        : ""
    }

    ${
      tipo === "final" && solicitudLogistica
        ? `<section class="section">
            <h3>Entrega y recepción</h3>
            <div class="grid2">
              <div class="field">
                <span>Modalidad</span>
                <strong>${
                  solicitudLogistica.tipo === "despacho"
                    ? "Despacho"
                    : "Retiro en taller"
                }</strong>
              </div>
              <div class="field">
                <span>Estado logístico</span>
                <strong>${escaparHtml(
                  etiquetaEstadoLogistica(solicitudLogistica.estado)
                )}</strong>
              </div>
              <div class="field">
                <span>Fecha programada</span>
                <strong>${escaparHtml(
                  formatFechaCorta(solicitudLogistica.fecha)
                )}</strong>
              </div>
              <div class="field">
                <span>Horario</span>
                <strong>${escaparHtml(
                  solicitudLogistica.tipo === "despacho"
                    ? solicitudLogistica.hora || "-"
                    : bloqueRetiroDesdeHora(solicitudLogistica.hora)
                )}</strong>
              </div>
              <div class="field">
                <span>Fecha y hora de entrega</span>
                <strong>${escaparHtml(
                  formatFecha(solicitudLogistica.entregado_at)
                )}</strong>
              </div>
              <div class="field">
                <span>Recibido por</span>
                <strong>${escaparHtml(
                  solicitudLogistica.recibido_por || "-"
                )}</strong>
              </div>
            </div>
            <p><strong>Observación de entrega:</strong><br />${textoConSaltos(
              solicitudLogistica.entrega_observacion || "-"
            )}</p>
          </section>
          ${renderFotosPDF("Evidencia de entrega", fotosEntregaPDF)}`
        : ""
    }

    ${
      documentosIngreso.length > 0
        ? `<section class="section">
            <h3>Documentos asociados</h3>
            <ul class="docsList">
              ${documentosIngreso
                .filter((doc) => Boolean(doc.url))
                .map(
                  (doc, index) => `
                    <li>
                      <a href="${escaparHtml(
                        doc.url
                      )}" target="_blank" rel="noopener noreferrer">
                        ${escaparHtml(doc.nombre || `Documento ${index + 1}`)}
                      </a>
                      ${doc.tipo ? ` · ${escaparHtml(doc.tipo)}` : ""}
                    </li>
                  `
                )
                .join("")}
            </ul>
          </section>`
        : ""
    }

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
          "No se pudo abrir el PDF. Revisa si el navegador bloqueó la ventana emergente."
        );
        return;
      }

      ventana.document.open();
      ventana.document.write(html);
      ventana.document.close();
    } finally {
      setGenerandoPdf(false);
    }
  }

  if (loading) {
    return <main className="p-6">Cargando orden...</main>;
  }

  if (error || !orden) {
    return (
      <main className="p-6">
        <Link href="/cliente/portal/servicio-tecnico" className="text-blue-600">
          ← Volver
        </Link>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          {error || "Orden no encontrada"}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-6 p-6">
      <Link href="/cliente/portal/servicio-tecnico" className="text-blue-600">
        ← Volver a Servicio Técnico
      </Link>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Orden de Servicio
            </p>

            <h1 className="mt-1 text-4xl font-bold text-slate-900">
              {orden.codigo}
            </h1>

            <p className="mt-2 text-lg text-slate-500">{orden.equipo}</p>
          </div>

          <span
            className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${getBadgeClass(
              estadoCliente
            )}`}
          >
            {estadoCliente}
          </span>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Estado de avance
        </h2>

        <div className="overflow-x-auto">
          <div className="flex min-w-[920px] items-center justify-between">
            {etapasVisuales.map((etapa, index) => (
              <div key={etapa.key} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-bold ${getCircleClass(
                      {
                        completada: etapa.completada,
                        activa: etapa.activa,
                        estadoActual: estadoCliente,
                        etapaKey: etapa.key,
                      }
                    )}`}
                  >
                    {etapa.numero}
                  </div>

                  <span
                    className={`text-center text-sm ${getTextClass({
                      completada: etapa.completada,
                      activa: etapa.activa,
                      estadoActual: estadoCliente,
                      etapaKey: etapa.key,
                    })}`}
                  >
                    {etapa.label}
                  </span>
                </div>

                {index < etapasVisuales.length - 1 && (
                  <div
                    className={`mx-3 h-[3px] flex-1 rounded-full ${getLineClass(
                      index,
                      estadoCliente
                    )}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          Información de ingreso
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoItem label="Cliente" value={orden.cliente} />
          <InfoItem label="Equipo" value={orden.equipo} />
          <InfoItem label="Marca" value={orden.marca} />
          <InfoItem label="Modelo" value={orden.modelo} />
          <InfoItem label="Número de serie" value={orden.numero_serie} />
          <InfoItem label="Prioridad" value={orden.prioridad} />
          <InfoItem label="Estado actual" value={estadoCliente} />
          <InfoItem
            label="Fecha de ingreso"
            value={formatFecha(orden.created_at)}
          />
        </div>

        <InfoBlock
          label="Accesorios entregados"
          value={orden.accesorios_entregados}
        />

        <InfoBlock
          label="Problema reportado"
          value={orden.problema_reportado}
        />

        <InfoBlock
          label="Observaciones iniciales"
          value={orden.observaciones_iniciales}
        />
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-slate-900">
          Fotos del estado inicial
        </h2>

        {fotosIngreso.length === 0 ? (
          <p className="text-slate-500">No hay fotos iniciales registradas.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {fotosIngreso.map((foto, i) => (
              <a
                key={`${foto}-${i}`}
                href={foto}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-2xl border bg-slate-100"
              >
                <img
                  src={foto}
                  alt={`Foto ingreso ${i + 1}`}
                  className="h-40 w-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          Historial de reportes
        </h2>

        {reportes.length === 0 ? (
          <p className="text-slate-500">
            Todavía no hay reportes técnicos para esta orden.
          </p>
        ) : (
          <div className="space-y-5">
            {reportes.map((reporte) => {
              const fotos = reporte.reporte_fotos || [];
              const estadoReporte = normalizarEstadoCliente(reporte.etapa);

              return (
                <article
                  key={reporte.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(
                        estadoReporte
                      )}`}
                    >
                      {estadoReporte}
                    </span>

                    <span className="text-sm text-slate-500">
                      {formatFecha(reporte.created_at)}
                    </span>
                  </div>

                  {reporte.descripcion && (
                    <p className="mb-3 text-base font-semibold text-slate-900">
                      {reporte.descripcion}
                    </p>
                  )}

                  {reporte.hallazgos && (
                    <InfoBlock label="Hallazgos" value={reporte.hallazgos} />
                  )}

                  {reporte.acciones && (
                    <InfoBlock
                      label="Acciones realizadas"
                      value={reporte.acciones}
                    />
                  )}

                  {reporte.costo != null && (
                    <InfoBlock
                      label="Costo informado"
                      value={formatMoneda(reporte.costo)}
                    />
                  )}

                  {fotos.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-semibold text-slate-600">
                        Fotos del reporte
                      </p>

                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {fotos.map((foto) => (
                          <a
                            key={foto.id}
                            href={foto.foto_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block overflow-hidden rounded-xl border bg-white"
                          >
                            <img
                              src={foto.foto_url}
                              alt="Foto reporte"
                              className="h-32 w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <InfoActionCard
          titulo="Diagnóstico técnico"
          estado={diagnostico ? "Disponible" : "Pendiente"}
          texto={
            diagnostico
              ? "El informe técnico de diagnóstico ya está disponible para esta orden."
              : "El diagnóstico técnico todavía no está disponible."
          }
          boton="Descargar informe técnico PDF"
          disabled={!diagnostico || generandoPdf}
          onClick={() => generarPDF("diagnostico")}
        />

        <InfoActionCard
          titulo="Cotización"
          estado={cotizacionEstado}
          texto={
            cotizacionEstado === "Aprobada"
              ? "La cotización fue aprobada. El equipo puede avanzar a trabajo."
              : cotizacionEstado === "Rechazada"
                ? "La cotización fue rechazada."
                : cotizacionEstado === "Pendiente de aprobación"
                  ? "La cotización se encuentra pendiente de aprobación."
                  : "La cotización todavía no está disponible."
          }
          boton=""
          disabled
          onClick={() => {}}
        />

        <InfoActionCard
          titulo="Informe técnico final"
          estado={
            puedeDescargarFinal(estadoCliente) ? "Disponible" : "Pendiente"
          }
          texto={
            puedeDescargarFinal(estadoCliente)
              ? entregaCompletada
                ? "El informe técnico final incluye la evidencia de entrega registrada por Logística."
                : "El informe técnico final ya puede ser descargado."
              : "El informe final estará disponible cuando el equipo avance a trabajo, listo para entrega o entregado."
          }
          boton="Descargar informe final PDF"
          disabled={!puedeDescargarFinal(estadoCliente) || generandoPdf}
          onClick={() => generarPDF("final")}
        />
      </section>

      {estadoCliente === "Listo para entrega" ||
      estadoCliente === "Entregado" ? (
        <section className="rounded-3xl border border-blue-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Coordinación logística
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Retiro o despacho
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                {solicitudLogistica
                  ? "La solicitud ya fue registrada y está disponible para el equipo de Logística."
                  : estadoCliente === "Entregado"
                    ? "La orden ya figura como entregada."
                    : "Selecciona si retirarás el equipo en el taller de MJ Industrial o si necesitas despacho."}
              </p>
            </div>

            {solicitudLogistica ? (
              <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {etiquetaEstadoLogistica(solicitudLogistica.estado)}
              </span>
            ) : null}
          </div>

          {solicitudLogistica ? (
            <div
              className={`mt-5 rounded-2xl border p-5 ${
                entregaCompletada
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              {entregaCompletada ? (
                <div className="mb-5 flex flex-col justify-between gap-3 border-b border-emerald-200 pb-4 md:flex-row md:items-center">
                  <div>
                    <p className="text-sm font-semibold text-emerald-700">
                      Entrega completada
                    </p>

                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      La entrega fue registrada por el equipo de Logística.
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    Entregado
                  </span>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem
                  label="Modalidad"
                  value={
                    solicitudLogistica.tipo === "despacho"
                      ? "Despacho"
                      : "Retiro en taller"
                  }
                />

                <InfoItem
                  label={
                    solicitudLogistica.tipo === "despacho"
                      ? solicitudLogistica.estado === "solicitado"
                        ? "Fecha de solicitud"
                        : "Fecha programada"
                      : "Fecha de retiro"
                  }
                  value={formatFechaCorta(solicitudLogistica.fecha)}
                />

                {solicitudLogistica.tipo !== "despacho" ? (
                  <InfoItem
                    label="Bloque de retiro"
                    value={bloqueRetiroDesdeHora(solicitudLogistica.hora)}
                  />
                ) : (
                  <InfoItem
                    label="Horario"
                    value={solicitudLogistica.hora || "Pendiente de coordinación"}
                  />
                )}

                {solicitudLogistica.tipo === "despacho" ? (
                  <InfoItem
                    label="Dirección"
                    value={[
                      solicitudLogistica.direccion,
                      solicitudLogistica.comuna,
                      solicitudLogistica.region,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                ) : (
                  <InfoItem
                    label="Lugar"
                    value="Taller MJ Industrial"
                  />
                )}

                {entregaCompletada ? (
                  <>
                    <InfoItem
                      label="Fecha y hora de entrega"
                      value={formatFecha(solicitudLogistica.entregado_at)}
                    />

                    <InfoItem
                      label="Recibido por"
                      value={solicitudLogistica.recibido_por}
                    />
                  </>
                ) : null}
              </div>

              {solicitudLogistica.observacion ? (
                <InfoBlock
                  label="Observación de coordinación"
                  value={solicitudLogistica.observacion}
                />
              ) : null}

              {entregaCompletada &&
              solicitudLogistica.entrega_observacion ? (
                <InfoBlock
                  label="Observación de entrega"
                  value={solicitudLogistica.entrega_observacion}
                />
              ) : null}

              {entregaCompletada &&
              solicitudLogistica.entrega_foto_url ? (
                <div className="mt-5">
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    Foto de entrega
                  </p>

                  <a
                    href={solicitudLogistica.entrega_foto_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-200 bg-white"
                  >
                    <img
                      src={solicitudLogistica.entrega_foto_url}
                      alt="Evidencia de entrega"
                      className="h-56 w-full object-cover"
                    />

                    <div className="p-3 text-sm font-semibold text-blue-700">
                      Ver foto completa
                    </div>
                  </a>
                </div>
              ) : null}

              <p className="mt-4 text-xs leading-5 text-slate-500">
                {entregaCompletada
                  ? "La evidencia de entrega también se incluye en el informe técnico final."
                  : "Para modificar esta solicitud, comunícate con MJ Industrial."}
              </p>
            </div>
          ) : estadoCliente === "Listo para entrega" ? (
            <>
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setModalidadEntrega("retiro_taller")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    modalidadEntrega === "retiro_taller"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-blue-300"
                  }`}
                >
                  <span className="block text-base font-bold text-slate-900">
                    Retirar en taller
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    Selecciona una fecha y uno de los dos bloques disponibles.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalidadEntrega("despacho")}
                  className={`rounded-2xl border p-5 text-left transition ${
                    modalidadEntrega === "despacho"
                      ? "border-blue-600 bg-blue-50"
                      : "border-slate-200 bg-slate-50 hover:border-blue-300"
                  }`}
                >
                  <span className="block text-base font-bold text-slate-900">
                    Solicitar despacho
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-slate-600">
                    Envía la dirección y los datos de contacto para que Logística coordine la entrega.
                  </span>
                </button>
              </div>

              {modalidadEntrega === "retiro_taller" ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Fecha de retiro

                      <input
                        type="date"
                        min={fechaHoyISO()}
                        value={fechaRetiro}
                        onChange={(event) => setFechaRetiro(event.target.value)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>

                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        Bloque horario
                      </p>

                      <div className="mt-2 grid gap-2">
                        <button
                          type="button"
                          onClick={() => setBloqueRetiro("10:00")}
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${
                            bloqueRetiro === "10:00"
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          10:00 a 12:30 hrs.
                        </button>

                        <button
                          type="button"
                          onClick={() => setBloqueRetiro("15:00")}
                          className={`rounded-xl border px-4 py-3 text-left text-sm font-bold ${
                            bloqueRetiro === "15:00"
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white text-slate-700"
                          }`}
                        >
                          15:00 a 17:00 hrs.
                        </button>
                      </div>
                    </div>
                  </div>

                  <label className="mt-5 grid gap-2 text-sm font-semibold text-slate-700">
                    Observación opcional

                    <textarea
                      rows={3}
                      value={observacionEntrega}
                      onChange={(event) =>
                        setObservacionEntrega(event.target.value)
                      }
                      placeholder="Ej.: retirará Juan Pérez, patente del vehículo, etc."
                      className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
              ) : null}

              {modalidadEntrega === "despacho" ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      Dirección de despacho

                      <input
                        value={direccionDespacho}
                        onChange={(event) =>
                          setDireccionDespacho(event.target.value)
                        }
                        placeholder="Calle, número y referencias"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Comuna

                      <input
                        value={comunaDespacho}
                        onChange={(event) =>
                          setComunaDespacho(event.target.value)
                        }
                        placeholder="Comuna"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Región

                      <input
                        value={regionDespacho}
                        onChange={(event) =>
                          setRegionDespacho(event.target.value)
                        }
                        placeholder="Región"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Persona de contacto

                      <input
                        value={contactoDespacho}
                        onChange={(event) =>
                          setContactoDespacho(event.target.value)
                        }
                        placeholder="Nombre de quien recibirá"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700">
                      Teléfono

                      <input
                        value={telefonoDespacho}
                        onChange={(event) =>
                          setTelefonoDespacho(event.target.value)
                        }
                        placeholder="+56 9..."
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                      Observaciones

                      <textarea
                        rows={3}
                        value={observacionEntrega}
                        onChange={(event) =>
                          setObservacionEntrega(event.target.value)
                        }
                        placeholder="Horario de recepción, acceso, piso, bodega, referencias, etc."
                        className="rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {modalidadEntrega ? (
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={guardarSolicitudEntrega}
                    disabled={guardandoEntrega}
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {guardandoEntrega
                      ? "Guardando..."
                      : modalidadEntrega === "retiro_taller"
                        ? "Confirmar retiro"
                        : "Enviar solicitud de despacho"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function InfoActionCard({
  titulo,
  estado,
  texto,
  boton,
  disabled,
  onClick,
}: {
  titulo: string;
  estado: string;
  texto: string;
  boton: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
          {estado}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">{texto}</p>

      {boton ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {boton}
        </button>
      ) : null}
    </section>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value || "-"}</p>
    </div>
  );
}

function InfoBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-slate-800">{value || "-"}</p>
    </div>
  );
}