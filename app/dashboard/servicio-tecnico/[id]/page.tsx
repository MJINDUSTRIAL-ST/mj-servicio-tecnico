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
      `}</style>
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
  const [tab, setTab] = useState<
    | "detalle"
    | "checklist"
    | "diagnostico"
    | "revision"
    | "cotizacion"
    | "trabajo"
    | "reportes"
  >("detalle");
  const [eventoLogistica, setEventoLogistica] =
    useState<EventoLogisticaOT | null>(null);
  const [formularioLogistica, setFormularioLogistica] =
    useState<FormularioLogisticaListo>(() => formularioLogisticaInicial());
  const [creandoSolicitudLogistica, setCreandoSolicitudLogistica] =
    useState(false);

  const fotosIngreso = useMemo(() => {
    return normalizarFotosIngreso(orden?.fotos_estado_inicial);
  }, [orden?.fotos_estado_inicial]);

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

  async function cargarDatos() {
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

    setEventoLogistica((eventoLogisticaData as EventoLogisticaOT) || null);

    setOrden(ordenData as Orden);
    setEquiposLote((equiposData || []) as EquipoLote[]);
    setDocumentosIngreso((documentosData || []) as OrdenDocumento[]);
    setReportes(reportesNormalizados);
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

  async function generarPDF() {
    setGenerandoPdf(true);

    try {
      window.print();
    } finally {
      setGenerandoPdf(false);
    }
  }

  async function avanzarADiagnostico(payload?: any) {
    if (!orden) return;

    const equipoId = payload?.equipoId || orden.id;
    const diagnosticoIA = payload?.diagnostico;

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

    const datosRevisionEquipo: Record<string, any> = {
      estado: "Revisión",
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
    equipo.id === equipoId ? { ...equipo, estado: "Diagnóstico" } : equipo,
  ),
);

setTab("diagnostico");

    await cargarDatos();
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

          <TabsOT tab={tab} onChange={setTab} />

          {tab === "detalle" && (
            <>
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

                  <ChecklistIngreso ordenId={orden.id} />
                </>
              )}
            </>
          )}

          {tab === "checklist" &&
            (esOtMadreLote ? (
              <ChecklistLote equipos={equiposLote} ordenId={orden.id} />
            ) : (
              <ChecklistInteligente
                equipoId={orden.id}
                tipoEquipoInicial={orden.equipo}
                onGenerarDiagnostico={avanzarADiagnostico}
              />
            ))}

          {tab === "diagnostico" && (
            <DiagnosticoTecnico
              ordenId={orden.id}
              onEstadoActualizado={(estado) => {
                setOrden((prev) => {
                  if (!prev) return prev;
                  return { ...prev, estado };
                });
              }}
            />
          )}

          {tab === "revision" && (
            <RevisionJefe
              ordenId={orden.id}
              onEstadoActualizado={(estado) => {
                setOrden((prev) => {
                  if (!prev) return prev;
                  return { ...prev, estado };
                });
              }}
            />
          )}

          {tab === "cotizacion" && (
            <CotizacionInterna
              ordenId={orden.id}
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
              }}
            />
          )}

          {tab === "trabajo" &&
            (estadoActual === "Listo" || estadoActual === "Entregado" ? (
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

                  <span className="listoBadge">
                    {eventoLogistica
                      ? etiquetaEstadoLogistica(eventoLogistica.estado)
                      : "Pendiente coordinación"}
                  </span>
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
            ) : (
              <TrabajoOT
                ordenId={orden.id}
                onEstadoActualizado={(estado) => {
                  setOrden((prev) => {
                    if (!prev) return prev;
                    return { ...prev, estado };
                  });

                  const estadoNormalizado = normalizarEstado(estado);

                  if (estadoNormalizado === "Listo") {
                    setTab("trabajo");
                    cargarDatos();
                  }
                }}
              />
            ))}

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
      `}</style>
    </>
  );
}
