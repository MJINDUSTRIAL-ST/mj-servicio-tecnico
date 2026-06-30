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
import DiagnosticoTecnico from "./components/DiagnosticoTecnico";
import RevisionJefe from "./components/RevisionJefe";
import CotizacionInterna from "./components/CotizacionInterna";
import TrabajoOT from "./components/TrabajoOT";

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
  "Diagnóstico",
  "Revisión",
  "Cotización",
  "Trabajo",
  "Listo",
  "Entregado",
];

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Ingreso";

  const e = estado.toLowerCase();

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

  if (e.includes("jefe") || e.includes("aprobado")) {
    return "Revisión";
  }

  if (
    e.includes("diagnóstico") ||
    e.includes("diagnostico") ||
    e.includes("revisión") ||
    e.includes("revision")
  ) {
    return "Diagnóstico";
  }

  return "Ingreso";
}

function badgeEstado(estado: string) {
  const estadoNormal = normalizarEstado(estado);

  if (estadoNormal === "Cotización") {
    return { bg: "#fef3c7", color: "#b45309" };
  }

  if (estadoNormal === "Listo" || estadoNormal === "Entregado") {
    return { bg: "#dcfce7", color: "#15803d" };
  }

  if (estadoNormal === "Trabajo") {
    return { bg: "#dcfce7", color: "#15803d" };
  }

  if (estadoNormal === "Revisión") {
    return { bg: "#fef3c7", color: "#b45309" };
  }

  if (estadoNormal === "Diagnóstico") {
    return { bg: "#ede9fe", color: "#6d28d9" };
  }

  return { bg: "#dbeafe", color: "#2563eb" };
}

function normalizarFotosIngreso(fotos?: string | string[] | null) {
  if (!fotos) return [];

  if (Array.isArray(fotos)) {
    return fotos.filter(Boolean);
  }

  if (typeof fotos === "string") {
    try {
      const parsed = JSON.parse(fotos);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {}

    return fotos
      .split(",")
      .map((foto) => foto.trim())
      .filter(Boolean);
  }

  return [];
}

export default function DetalleOrdenPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [documentosIngreso, setDocumentosIngreso] = useState<OrdenDocumento[]>(
    []
  );
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [eliminandoFotoId, setEliminandoFotoId] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [tab, setTab] = useState<
  | "detalle"
  | "diagnostico"
  | "revision"
  | "cotizacion"
  | "trabajo"
  | "reportes"
>("detalle");

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

  const estadoActual = useMemo(() => {
  return normalizarEstado(orden?.estado);
}, [orden?.estado]);

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
      `
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
          }
        ),
      })
    );

    setOrden(ordenData as Orden);
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

        if (errorStorage) {
          throw new Error(errorStorage.message);
        }
      }

      const { error: errorDb } = await supabase
        .from("reporte_fotos")
        .delete()
        .eq("id", foto.id);

      if (errorDb) {
        throw new Error(errorDb.message);
      }

      setReportes((prev) =>
        prev.map((reporte) => {
          const contieneFoto = reporte.reporte_fotos?.some(
            (f) => f.id === foto.id
          );

          if (!contieneFoto) return reporte;

          return {
            ...reporte,
            reporte_fotos: (reporte.reporte_fotos || []).filter(
              (f) => f.id !== foto.id
            ),
          };
        })
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
          <CotizacionInterna />
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

      @media (max-width: 900px) {
        .page {
          padding: 22px 14px 50px;
        }

        .twoColumns {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  </>
);
}