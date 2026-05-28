"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  "Revisión",
  "Cotización",
  "Mantenimiento",
  "Reparación",
  "Listo",
  "Entregado",
];

const ICONOS: Record<string, string> = {
  Ingreso: "📦",
  Revisión: "🔍",
  Cotización: "📄",
  Mantenimiento: "⚙️",
  Reparación: "🔧",
  Listo: "✅",
  Entregado: "🚚",
};

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Ingreso";

  const limpio = estado.trim();

  if (limpio === "revision" || limpio === "Revision") return "Revisión";
  if (limpio === "cotizacion" || limpio === "Cotizacion") return "Cotización";
  if (limpio === "mantenimiento") return "Mantenimiento";
  if (limpio === "reparacion" || limpio === "Reparacion") return "Reparación";
  if (limpio === "listo") return "Listo";
  if (limpio === "entregado") return "Entregado";
  if (limpio === "ingreso") return "Ingreso";

  if (limpio === "Mant.") return "Mantenimiento";
  if (limpio === "Repar.") return "Reparación";
  if (limpio === "Listo p/Entrega") return "Listo";

  return limpio;
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
  if (valor == null) return "-";

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
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

function badgeEstado(estado: string) {
  const estadoNormal = normalizarEstado(estado);

  if (estadoNormal === "Cotización") return { bg: "#fef3c7", color: "#b45309" };
  if (estadoNormal === "Listo" || estadoNormal === "Entregado")
    return { bg: "#dcfce7", color: "#15803d" };
  if (estadoNormal === "Reparación") return { bg: "#ffedd5", color: "#c2410c" };
  if (estadoNormal === "Mantenimiento")
    return { bg: "#cffafe", color: "#0e7490" };
  if (estadoNormal === "Ingreso") return { bg: "#e2e8f0", color: "#334155" };

  return { bg: "#dbeafe", color: "#2563eb" };
}

function nombreTipoDocumento(tipo?: string | null) {
  if (!tipo) return "Documento";

  const nombres: Record<string, string> = {
    "orden-compra": "Orden de Compra",
    cotizacion: "Cotización",
    "informe-recibido": "Informe recibido",
    otros: "Otro documento",
  };

  return nombres[tipo] || tipo;
}

function Campo({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "145px 1fr",
        gap: 12,
        fontSize: 15,
        lineHeight: 1.45,
      }}
    >
      <div style={{ color: "#64748b", fontWeight: 700 }}>{label}:</div>
      <div
        style={{
          color: "#0f172a",
          whiteSpace: "pre-wrap",
          fontWeight: 500,
        }}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function CampoPDF({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.45 }}>
      <strong>{label}:</strong> {value || "-"}
    </div>
  );
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

  const pdfRef = useRef<HTMLDivElement | null>(null);

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

  const estadoActualTimeline = useMemo(() => {
    if (reportesOrdenados.length > 0) {
      return normalizarEstado(reportesOrdenados[reportesOrdenados.length - 1].etapa);
    }

    return normalizarEstado(orden?.estado);
  }, [reportesOrdenados, orden?.estado]);

  const etapaActualIndex = useMemo(() => {
    const index = ETAPAS.indexOf(estadoActualTimeline);
    return index >= 0 ? index : 0;
  }, [estadoActualTimeline]);

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
          throw new Error(
            "Error eliminando imagen del storage: " + errorStorage.message
          );
        }
      }

      const { error: errorDb } = await supabase
        .from("reporte_fotos")
        .delete()
        .eq("id", foto.id);

      if (errorDb) {
        throw new Error("Error eliminando registro de foto: " + errorDb.message);
      }

      setReportes((prev) =>
        prev.map((reporte) => {
          const contieneFoto = reporte.reporte_fotos?.some(
            (f) => f.id === foto.id
          );

          if (!contieneFoto) return reporte;

          let nuevasFotos = (reporte.reporte_fotos || []).filter(
            (f) => f.id !== foto.id
          );

          if (
            nuevasFotos.length > 0 &&
            !nuevasFotos.some((f) => f.es_principal === true)
          ) {
            nuevasFotos = nuevasFotos.map((f, index) => ({
              ...f,
              es_principal: index === 0,
            }));
          }

          return {
            ...reporte,
            reporte_fotos: nuevasFotos,
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

  async function esperarImagenes(el: HTMLElement) {
    const imagenes = Array.from(el.querySelectorAll("img"));

    await Promise.all(
      imagenes.map((img) => {
        if (img.complete) return Promise.resolve(true);

        return new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(true);
        });
      })
    );
  }

  async function generarPDF() {
    if (!pdfRef.current || !orden) return;

    setGenerandoPdf(true);

    try {
      const element = pdfRef.current;
      await esperarImagenes(element);

      const elementRect = element.getBoundingClientRect();

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1200,
      });

      const scale = canvas.width / elementRect.width;

      const linksPDF = Array.from(
        element.querySelectorAll<HTMLElement>("[data-pdf-url]")
      ).map((link) => {
        const rect = link.getBoundingClientRect();

        return {
          url: link.dataset.pdfUrl || "",
          left: (rect.left - elementRect.left) * scale,
          top: (rect.top - elementRect.top) * scale,
          width: rect.width * scale,
          height: rect.height * scale,
        };
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const marginMm = 10;
      const usableWidthMm = pageWidthMm - marginMm * 2;
      const usableHeightMm = pageHeightMm - marginMm * 2;

      const pxPerMm = canvas.width / usableWidthMm;
      const pageCanvasHeightPx = Math.floor(usableHeightMm * pxPerMm);

      let renderedHeight = 0;
      let pageNumber = 0;

      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(
          pageCanvasHeightPx,
          canvas.height - renderedHeight
        );

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext("2d");
        if (!ctx) break;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          canvas.width,
          sliceHeight
        );

        const pageImgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const sliceHeightMm = sliceHeight / pxPerMm;

        if (pageNumber > 0) pdf.addPage();

        pdf.addImage(
          pageImgData,
          "JPEG",
          marginMm,
          marginMm,
          usableWidthMm,
          sliceHeightMm
        );

        linksPDF.forEach((link) => {
          if (!link.url) return;

          const linkTop = link.top;
          const linkBottom = link.top + link.height;
          const pageTop = renderedHeight;
          const pageBottom = renderedHeight + sliceHeight;

          const visible = linkBottom > pageTop && linkTop < pageBottom;
          if (!visible) return;

          const xMm = marginMm + link.left / pxPerMm;
          const yMm = marginMm + (link.top - renderedHeight) / pxPerMm;
          const wMm = link.width / pxPerMm;
          const hMm = link.height / pxPerMm;

          pdf.link(xMm, yMm, wMm, hMm, { url: link.url });
        });

        renderedHeight += sliceHeight;
        pageNumber += 1;
      }

      pdf.save(`Reporte-${orden.codigo || orden.id}.pdf`);
    } catch (e: any) {
      alert(e.message || "No se pudo generar el PDF");
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
        <Link
          href="/dashboard/servicio-tecnico"
          style={{
            color: "#2563eb",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Volver
        </Link>

        <div
          style={{
            marginTop: 24,
            backgroundColor: "white",
            padding: 24,
            borderRadius: 18,
          }}
        >
          {error || "Orden no encontrada"}
        </div>
      </main>
    );
  }

  const estadoBadge = badgeEstado(estadoActualTimeline);

  return (
    <>
      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          padding: "28px 32px 60px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1080, margin: "0 auto" }}>
          <Link
            href="/dashboard/servicio-tecnico"
            style={{
              display: "inline-block",
              marginBottom: 18,
              color: "#64748b",
              textDecoration: "none",
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            ← Volver
          </Link>

          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              marginBottom: 22,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <h1
                  style={{
                    margin: 0,
                    fontSize: 30,
                    color: "#0f172a",
                    fontWeight: 800,
                  }}
                >
                  {orden.codigo}
                </h1>

                <span
                  style={{
                    backgroundColor: estadoBadge.bg,
                    color: estadoBadge.color,
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {estadoActualTimeline}
                </span>

                <span
                  style={{
                    backgroundColor: "#dbeafe",
                    color: "#2563eb",
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {orden.prioridad || "Media"}
                </span>
              </div>

              <div style={{ marginTop: 6, fontSize: 14, color: "#64748b" }}>
                {formatFecha(orden.created_at)}
              </div>
            </div>

            <button
              onClick={generarPDF}
              disabled={generandoPdf}
              style={{
                backgroundColor: "#16a34a",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "12px 16px",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 14,
                opacity: generandoPdf ? 0.7 : 1,
              }}
            >
              {generandoPdf ? "Generando..." : "📄 Descargar PDF"}
            </button>
          </header>

          <section
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 22,
              border: "1px solid #e2e8f0",
              marginBottom: 18,
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                minWidth: 820,
              }}
            >
              {ETAPAS.map((etapa, index) => {
                const completada = index <= etapaActualIndex;
                const actual = index === etapaActualIndex;

                return (
                  <div
                    key={etapa}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <div style={{ textAlign: "center", minWidth: 82 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          margin: "0 auto 8px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: actual
                            ? "#2563eb"
                            : completada
                            ? "#dbeafe"
                            : "#e5e7eb",
                          color: actual
                            ? "white"
                            : completada
                            ? "#2563eb"
                            : "#94a3b8",
                          fontWeight: 800,
                          fontSize: 17,
                        }}
                      >
                        {ICONOS[etapa]}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: actual ? 800 : 700,
                          color: completada ? "#2563eb" : "#94a3b8",
                        }}
                      >
                        {etapa}
                      </div>
                    </div>

                    {index < ETAPAS.length - 1 && (
                      <div
                        style={{
                          height: 3,
                          flex: 1,
                          backgroundColor:
                            index < etapaActualIndex ? "#2563eb" : "#e5e7eb",
                          margin: "0 4px 26px",
                          borderRadius: 999,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 18,
                padding: 22,
                border: "1px solid #e2e8f0",
              }}
            >
              <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  }}
>
  <h2
    style={{
      fontSize: 18,
      margin: 0,
      color: "#0f172a",
    }}
  >
    🔧 Detalle del equipo
  </h2>

  <button
    onClick={async () => {
      const nuevoTipo = prompt("Tipo", orden.equipo || "");
      if (nuevoTipo === null) return;

      const nuevaMarca = prompt("Marca", orden.marca || "");
      if (nuevaMarca === null) return;

      const nuevoModelo = prompt("Modelo", orden.modelo || "");
      if (nuevoModelo === null) return;

      const nuevaSerie = prompt(
        "Número de serie",
        orden.numero_serie || ""
      );
      if (nuevaSerie === null) return;

      const nuevosAccesorios = prompt(
        "Accesorios entregados",
        orden.accesorios_entregados || ""
      );
      if (nuevosAccesorios === null) return;

      const { error } = await supabase
        .from("ordenes")
        .update({
          equipo: nuevoTipo,
          marca: nuevaMarca,
          modelo: nuevoModelo,
          numero_serie: nuevaSerie,
          accesorios_entregados: nuevosAccesorios,
        })
        .eq("id", orden.id);

      if (error) {
        alert("Error actualizando equipo");
        return;
      }

      setOrden((prev) =>
        prev
          ? {
              ...prev,
              equipo: nuevoTipo,
              marca: nuevaMarca,
              modelo: nuevoModelo,
              numero_serie: nuevaSerie,
              accesorios_entregados: nuevosAccesorios,
            }
          : prev
      );

      alert("Equipo actualizado");
    }}
    style={{
      backgroundColor: "#f59e0b",
      color: "white",
      border: "none",
      padding: "10px 14px",
      borderRadius: 10,
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 13,
    }}
  >
    ✏️ Modificar equipo
  </button>
</div>

<div style={{ display: "grid", gap: 10 }}>
                <Campo label="Tipo" value={orden.equipo} />
                <Campo label="Marca" value={orden.marca} />
                <Campo label="Modelo" value={orden.modelo} />
                <Campo label="Serie" value={orden.numero_serie} />
                <Campo label="Accesorios" value={orden.accesorios_entregados} />
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: 18,
                padding: 22,
                border: "1px solid #e2e8f0",
              }}
            >
              <h2 style={{ fontSize: 18, margin: "0 0 16px", color: "#0f172a" }}>
                👤 Detalle del cliente
              </h2>

              <div style={{ display: "grid", gap: 10 }}>
                <Campo label="Cliente" value={orden.cliente} />
                <Campo label="Email" value={orden.cliente_email} />
                <Campo label="Problema" value={orden.problema_reportado} />
                <Campo
                  label="Observaciones"
                  value={orden.observaciones_iniciales}
                />
              </div>
            </div>
          </section>

          <section
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 22,
              border: "1px solid #e2e8f0",
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 18, margin: "0 0 16px", color: "#0f172a" }}>
              📷 Fotos del estado inicial
            </h2>

            {fotosIngreso.length === 0 ? (
              <div style={{ color: "#64748b" }}>
                No hay fotos iniciales registradas.
              </div>
            ) : (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                {fotosIngreso.map((fotoUrl, index) => (
                  <img
                    key={`${fotoUrl}-${index}`}
                    src={fotoUrl}
                    alt={`Foto inicial ${index + 1}`}
                    onClick={() => setFotoModal(fotoUrl)}
                    style={{
                      width: 130,
                      height: 130,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #dbe4f0",
                      cursor: "pointer",
                      backgroundColor: "white",
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          <section
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 22,
              border: "1px solid #e2e8f0",
              marginBottom: 18,
            }}
          >
            <h2 style={{ fontSize: 18, margin: "0 0 16px", color: "#0f172a" }}>
              📄 Documentos del ingreso
            </h2>

            {documentosIngreso.length === 0 ? (
              <div style={{ color: "#64748b" }}>
                No hay documentos PDF registrados.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {documentosIngreso.map((documento) => (
                  <div
                    key={documento.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      border: "1px solid #e2e8f0",
                      borderRadius: 12,
                      padding: "14px 16px",
                      backgroundColor: "#f8fafc",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          color: "#0f172a",
                          marginBottom: 4,
                        }}
                      >
                        {nombreTipoDocumento(documento.tipo)}
                      </div>

                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        {documento.nombre || "Documento PDF"}
                      </div>
                    </div>

                    {documento.url && (
                      <a
                        href={documento.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: "#2563eb",
                          color: "white",
                          textDecoration: "none",
                          padding: "9px 13px",
                          borderRadius: 10,
                          fontWeight: 800,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Ver PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 22,
              border: "1px solid #e2e8f0",
              marginBottom: 18,
            }}
          >
            <div
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  }}
>
  <h2 style={{ fontSize: 18, margin: 0, color: "#0f172a" }}>
    🧾 Reportes ({reportesOrdenados.length})
  </h2>

  <Link
    href={`/dashboard/servicio-tecnico/${orden.id}/nuevo-reporte`}
    style={{
      backgroundColor: "#2563eb",
      color: "white",
      textDecoration: "none",
      padding: "12px 18px",
      borderRadius: 12,
      fontWeight: 800,
      fontSize: 14,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      boxShadow: "0 2px 8px rgba(37,99,235,0.2)",
    }}
  >
    → Siguiente etapa
  </Link>
</div>

            {reportesOrdenados.length === 0 ? (
              <div style={{ color: "#64748b" }}>
                Todavía no hay reportes para esta orden.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {reportesOrdenados.map((reporte) => {
                  const badge = badgeEstado(reporte.etapa);
                  const fotos = reporte.reporte_fotos || [];
                  const documentos = reporte.reporte_documentos || [];
                  const fotoPrincipal =
                    fotos.find((f) => f.es_principal) || fotos[0] || null;
                  const fotosSecundarias = fotos.filter(
                    (f) => f.id !== fotoPrincipal?.id
                  );

                  return (
                    <article
                      key={reporte.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: 18,
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          marginBottom: 10,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                              padding: "6px 10px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 800,
                            }}
                          >
                            {normalizarEstado(reporte.etapa)}
                          </span>


                          <Link
                            href={`/dashboard/servicio-tecnico/${orden.id}/reportes/${reporte.id}/editar`}
                            style={{
                              backgroundColor: "#f59e0b",
                              color: "white",
                              textDecoration: "none",
                              padding: "8px 12px",
                              borderRadius: 10,
                              fontWeight: 800,
                              fontSize: 12,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ✏️ Modificar
                          </Link>
                        </div>

                        <span
                          style={{
                            color: "#64748b",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          {formatFecha(reporte.created_at)}
                        </span>
                      </div>

                      {reporte.descripcion ? (
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontWeight: 700,
                            color: "#0f172a",
                          }}
                        >
                          {reporte.descripcion}
                        </p>
                      ) : null}

                      {reporte.hallazgos ? (
                        <p style={{ margin: "0 0 6px", color: "#334155" }}>
                          <strong>Hallazgos:</strong> {reporte.hallazgos}
                        </p>
                      ) : null}

                      {reporte.acciones ? (
                        <p style={{ margin: "0 0 6px", color: "#334155" }}>
                          <strong>Acciones:</strong> {reporte.acciones}
                        </p>
                      ) : null}

                      {reporte.costo != null ? (
                        <p style={{ margin: "0 0 10px", color: "#334155" }}>
                          <strong>Costo:</strong> {formatMoneda(reporte.costo)}
                        </p>
                      ) : null}

                      {documentos.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              fontWeight: 700,
                              marginBottom: 8,
                            }}
                          >
                            PDFs de la etapa
                          </div>

                          <div style={{ display: "grid", gap: 8 }}>
                            {documentos.map((documento) => (
                              <div
                                key={documento.id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  padding: "10px 12px",
                                  backgroundColor: "white",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 13,
                                    color: "#334155",
                                    fontWeight: 700,
                                  }}
                                >
                                  📄 {documento.nombre || "Documento PDF"}
                                </span>

                                {documento.url && (
                                  <a
                                    href={documento.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      backgroundColor: "#2563eb",
                                      color: "white",
                                      textDecoration: "none",
                                      padding: "7px 10px",
                                      borderRadius: 8,
                                      fontWeight: 800,
                                      fontSize: 12,
                                    }}
                                  >
                                    Ver PDF
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {fotoPrincipal ? (
                        <div style={{ marginTop: 12 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              fontWeight: 700,
                              marginBottom: 8,
                            }}
                          >
                            Foto principal
                          </div>

                          <div
                            style={{
                              position: "relative",
                              width: 150,
                              height: 150,
                            }}
                          >
                            <img
                              src={fotoPrincipal.foto_url}
                              alt="foto reporte"
                              onClick={() => setFotoModal(fotoPrincipal.foto_url)}
                              style={{
                                width: 150,
                                height: 150,
                                objectFit: "cover",
                                borderRadius: 12,
                                border: "1px solid #cbd5e1",
                                cursor: "pointer",
                              }}
                            />

                            <button
                              onClick={() => confirmarEliminarFoto(fotoPrincipal)}
                              disabled={eliminandoFotoId === fotoPrincipal.id}
                              style={{
                                position: "absolute",
                                top: 6,
                                right: 6,
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                border: "none",
                                backgroundColor: "rgba(15, 23, 42, 0.8)",
                                color: "white",
                                cursor: "pointer",
                                fontWeight: 700,
                              }}
                            >
                              {eliminandoFotoId === fotoPrincipal.id ? "…" : "×"}
                            </button>
                          </div>

                          {fotoPrincipal.comentario ? (
                            <div
                              style={{
                                marginTop: 8,
                                color: "#475569",
                                fontSize: 13,
                              }}
                            >
                              {fotoPrincipal.comentario}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {fotosSecundarias.length > 0 ? (
                        <div style={{ marginTop: 14 }}>
                          <div
                            style={{
                              fontSize: 13,
                              color: "#475569",
                              fontWeight: 700,
                              marginBottom: 8,
                            }}
                          >
                            Fotos adicionales
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              flexWrap: "wrap",
                            }}
                          >
                            {fotosSecundarias.map((foto) => (
                              <div
                                key={foto.id}
                                style={{
                                  position: "relative",
                                  width: 100,
                                }}
                              >
                                <img
                                  src={foto.foto_url}
                                  alt="foto adicional"
                                  onClick={() => setFotoModal(foto.foto_url)}
                                  style={{
                                    width: 100,
                                    height: 100,
                                    objectFit: "cover",
                                    borderRadius: 10,
                                    border: "1px solid #cbd5e1",
                                    cursor: "pointer",
                                  }}
                                />

                                <button
                                  onClick={() => confirmarEliminarFoto(foto)}
                                  disabled={eliminandoFotoId === foto.id}
                                  style={{
                                    position: "absolute",
                                    top: 5,
                                    right: 5,
                                    width: 22,
                                    height: 22,
                                    borderRadius: "50%",
                                    border: "none",
                                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                                    color: "white",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                    fontSize: 12,
                                  }}
                                >
                                  {eliminandoFotoId === foto.id ? "…" : "×"}
                                </button>

                                {foto.comentario ? (
                                  <div
                                    style={{
                                      marginTop: 5,
                                      color: "#475569",
                                      fontSize: 11,
                                    }}
                                  >
                                    {foto.comentario}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "95vw",
              maxHeight: "95vh",
            }}
          >
            <button
              onClick={() => setFotoModal(null)}
              style={{
                position: "absolute",
                top: -14,
                right: -14,
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "none",
                backgroundColor: "white",
                color: "#0f172a",
                fontSize: 24,
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
              }}
            >
              ×
            </button>

            <img
              src={fotoModal}
              alt="foto ampliada"
              style={{
                maxWidth: "95vw",
                maxHeight: "95vh",
                borderRadius: 16,
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
        </div>
      )}

      <div
        style={{
          position: "fixed",
          left: -99999,
          top: 0,
          width: 1040,
          backgroundColor: "#ffffff",
          padding: 0,
          zIndex: -1,
        }}
      >
        <div ref={pdfRef}>
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              color: "#111827",
              backgroundColor: "#ffffff",
              padding: 34,
              width: 1040,
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                borderBottom: "4px solid #f59e0b",
                paddingBottom: 18,
                marginBottom: 22,
              }}
            >
              <div>
                <img
                  src="/logo-mj.png"
                  alt="MJ Industrial"
                  style={{
                    width: 230,
                    height: "auto",
                    objectFit: "contain",
                    display: "block",
                    marginBottom: 12,
                  }}
                />

                <div
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                  }}
                >
                  Servicio Técnico · Informe de Orden
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    color: "#1d4ed8",
                    fontSize: 34,
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {orden.codigo}
                </div>

                <div
                  style={{
                    display: "inline-block",
                    marginTop: 10,
                    backgroundColor: estadoBadge.bg,
                    color: estadoBadge.color,
                    padding: "7px 13px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {estadoActualTimeline}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#64748b",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Generado: {formatFecha(new Date().toISOString())}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: 20 }}>🔧</div>
                  <h2
                    style={{
                      fontSize: 18,
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    Detalle del equipo
                  </h2>
                </div>

                <div style={{ display: "grid", gap: 9 }}>
                  <CampoPDF label="Tipo" value={orden.equipo} />
                  <CampoPDF label="Marca" value={orden.marca} />
                  <CampoPDF label="Modelo" value={orden.modelo} />
                  <CampoPDF label="N° Serie" value={orden.numero_serie} />
                  <CampoPDF
                    label="Accesorios"
                    value={orden.accesorios_entregados}
                  />
                </div>
              </div>

              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                    paddingBottom: 10,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <div style={{ fontSize: 20 }}>👤</div>
                  <h2
                    style={{
                      fontSize: 18,
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    Detalle del cliente
                  </h2>
                </div>

                <div style={{ display: "grid", gap: 9 }}>
                  <CampoPDF label="Cliente" value={orden.cliente} />
                  <CampoPDF label="Email" value={orden.cliente_email} />
                  <CampoPDF label="Prioridad" value={orden.prioridad || "Media"} />
                  <CampoPDF
                    label="Fecha ingreso"
                    value={formatFecha(orden.created_at)}
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  marginBottom: 12,
                  color: "#0f172a",
                  fontWeight: 900,
                }}
              >
                📝 Problema reportado y observaciones
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Problema reportado:</strong>{" "}
                  {orden.problema_reportado || "-"}
                </p>

                <p style={{ margin: 0 }}>
                  <strong>Observaciones iniciales:</strong>{" "}
                  {orden.observaciones_iniciales || "-"}
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 16,
                padding: 18,
                marginBottom: 18,
                breakInside: "avoid",
                pageBreakInside: "avoid",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                <h2
                  style={{
                    fontSize: 18,
                    margin: 0,
                    color: "#0f172a",
                  }}
                >
                  📷 Fotos del estado inicial
                </h2>

                <span
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {fotosIngreso.length} foto(s)
                </span>
              </div>

              {fotosIngreso.length === 0 ? (
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  No hay fotos iniciales registradas.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 10,
                  }}
                >
                  {fotosIngreso.map((fotoUrl, index) => (
                    <div
                      key={`${fotoUrl}-${index}`}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 12,
                        padding: 7,
                        height: 145,
                        backgroundColor: "#f8fafc",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={fotoUrl}
                        alt={`Foto ingreso ${index + 1}`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: 130,
                          objectFit: "contain",
                          display: "block",
                          borderRadius: 8,
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                backgroundColor: "#eff6ff",
                color: "#1e3a8a",
                padding: "12px 16px",
                borderRadius: 14,
                fontSize: 18,
                fontWeight: 900,
                marginBottom: 14,
                border: "1px solid #bfdbfe",
              }}
            >
              Historial de reportes
            </div>

            {reportesOrdenados.length === 0 ? (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 16,
                  padding: 18,
                  color: "#64748b",
                }}
              >
                No hay reportes registrados para esta orden.
              </div>
            ) : (
              reportesOrdenados.map((reporte, reporteIndex) => {
                const fotos = reporte.reporte_fotos || [];
                const documentos = reporte.reporte_documentos || [];
                const badge = badgeEstado(reporte.etapa);

                return (
                  <div
                    key={reporte.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 16,
                      padding: 18,
                      marginBottom: 16,
                      backgroundColor: "#ffffff",
                      breakInside: "avoid",
                      pageBreakInside: "avoid",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                        paddingBottom: 10,
                        borderBottom: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            borderRadius: "50%",
                            backgroundColor: badge.bg,
                            color: badge.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 900,
                          }}
                        >
                          {reporteIndex + 1}
                        </div>

                        <span
                          style={{
                            display: "inline-block",
                            backgroundColor: badge.bg,
                            color: badge.color,
                            padding: "7px 13px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 900,
                          }}
                        >
                          {normalizarEstado(reporte.etapa)}
                        </span>

                        {reporte.tecnico ? (
  <span
    style={{
      fontSize: 12,
      color: "#64748b",
      fontWeight: 500,
      marginLeft: 8,
    }}
  >
    👨‍🔧 {reporte.tecnico}
  </span>
) : null}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {formatFecha(reporte.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 14,
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      <div>
                        {reporte.descripcion ? (
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Descripción:</strong> {reporte.descripcion}
                          </p>
                        ) : null}

                        {reporte.hallazgos ? (
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Hallazgos:</strong> {reporte.hallazgos}
                          </p>
                        ) : null}
                      </div>

                      <div>
                        {reporte.acciones ? (
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Acciones realizadas:</strong>{" "}
                            {reporte.acciones}
                          </p>
                        ) : null}

                        {reporte.costo != null ? (
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Costo informado:</strong>{" "}
                            {formatMoneda(reporte.costo)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {documentos.length > 0 ? (
                      <div style={{ marginTop: 14 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 14,
                            marginBottom: 9,
                            color: "#334155",
                          }}
                        >
                          Documentos PDF adjuntos
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 9,
                          }}
                        >
                          {documentos.map((documento, index) => {
                            const nombreEtapa = normalizarEstado(reporte.etapa);
                            const textoBoton = `Ver PDF ${nombreEtapa}`;

                            return (
                              <a
                                key={documento.id || `${documento.url}-${index}`}
                                href={documento.url || "#"}
                                data-pdf-url={documento.url || ""}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                  border: "1px solid #bfdbfe",
                                  borderRadius: 12,
                                  padding: "11px 12px",
                                  backgroundColor: "#eff6ff",
                                  color: "#0f172a",
                                  textDecoration: "none",
                                  fontSize: 13,
                                  fontWeight: 800,
                                }}
                              >
                                <span
                                  style={{
                                    display: "block",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  📄 {documento.nombre || "Documento PDF"}
                                </span>

                                <span
                                  style={{
                                    color: "#2563eb",
                                    fontWeight: 900,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {textoBoton}
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {fotos.length > 0 ? (
                      <div style={{ marginTop: 14 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 14,
                            marginBottom: 9,
                            color: "#334155",
                          }}
                        >
                          Evidencia fotográfica
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 9,
                          }}
                        >
                          {fotos.map((foto) => (
                            <div
                              key={foto.id}
                              style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: 12,
                                padding: 7,
                                backgroundColor: "#f8fafc",
                              }}
                            >
                              <div
                                style={{
                                  height: 120,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <img
                                  src={foto.foto_url}
                                  alt="foto reporte"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: 110,
                                    objectFit: "contain",
                                    display: "block",
                                    borderRadius: 8,
                                  }}
                                />
                              </div>

                              {foto.comentario ? (
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "#475569",
                                    marginTop: 5,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {foto.comentario}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            <div
              style={{
                marginTop: 24,
                paddingTop: 14,
                borderTop: "1px solid #e2e8f0",
                fontSize: 12,
                color: "#64748b",
                textAlign: "center",
              }}
            >
              MJ Industrial · Informe generado automáticamente desde portal de
              servicio técnico.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}