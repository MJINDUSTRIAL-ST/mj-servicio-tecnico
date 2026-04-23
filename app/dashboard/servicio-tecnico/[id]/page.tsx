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

const ETAPAS = [
  "Ingreso",
  "Revisión",
  "Cotización",
  "Mantenimiento",
  "Reparación",
  "Listo",
  "Entregado",
];

function formatFecha(fecha?: string | null) {
  if (!fecha) return "";
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

export default function DetalleOrdenPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [eliminandoFotoId, setEliminandoFotoId] = useState<string | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const pdfRef = useRef<HTMLDivElement | null>(null);

  const etapaActualIndex = useMemo(() => {
    if (!orden?.estado) return -1;
    return ETAPAS.indexOf(orden.estado);
  }, [orden?.estado]);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setFotoModal(null);
      }
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
        )
      `
      )
      .eq("orden_id", id)
      .order("created_at", { ascending: false });

    if (errorReportes) {
      setError(errorReportes.message);
      setLoading(false);
      return;
    }

    const normalizados = ((reportesData || []) as Reporte[]).map((reporte) => ({
      ...reporte,
      reporte_fotos: [...(reporte.reporte_fotos || [])].sort((a, b) => {
        const ordenA = a.orden ?? 0;
        const ordenB = b.orden ?? 0;
        return ordenA - ordenB;
      }),
    }));

    setOrden(ordenData as Orden);
    setReportes(normalizados);
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
          throw new Error("Error eliminando imagen del storage: " + errorStorage.message);
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
          if (!reporte.reporte_fotos?.some((f) => f.id === foto.id)) return reporte;

          let nuevasFotos = (reporte.reporte_fotos || []).filter((f) => f.id !== foto.id);

          if (nuevasFotos.length > 0 && !nuevasFotos.some((f) => f.es_principal === true)) {
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

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 1200,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidthMm = 210;
      const pageHeightMm = 297;
      const marginMm = 10;
      const usableWidthMm = pageWidthMm - marginMm * 2;
      const usableHeightMm = pageHeightMm - marginMm * 2;

      const pxPerMm = canvas.width / usableWidthMm;
      const safeHeightMm = usableHeightMm - 20;
      const pageCanvasHeightPx = Math.floor(safeHeightMm * pxPerMm);

      let renderedHeight = 0;
      let pageNumber = 0;

      while (renderedHeight < canvas.height) {
        const sliceHeight = Math.min(pageCanvasHeightPx, canvas.height - renderedHeight);

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

        if (pageNumber > 0) {
          pdf.addPage();
        }

        pdf.addImage(
          pageImgData,
          "JPEG",
          marginMm,
          marginMm,
          usableWidthMm,
          sliceHeightMm
        );

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
    return <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>Cargando...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        Error: {error}
      </div>
    );
  }

  if (!orden) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        No se encontró la orden.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f3f6fb",
          padding: 32,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <Link
            href="/dashboard/servicio-tecnico"
            style={{
              display: "inline-block",
              marginBottom: 24,
              color: "#475569",
              textDecoration: "none",
              fontSize: 18,
            }}
          >
            ← Volver
          </Link>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: 56,
                  margin: 0,
                  color: "#0f172a",
                  fontWeight: 500,
                }}
              >
                {orden.codigo}
              </h1>

              <div
                style={{
                  marginTop: 12,
                  fontSize: 20,
                  color: "#64748b",
                }}
              >
                {orden.equipo}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={generarPDF}
                disabled={generandoPdf}
                style={{
                  backgroundColor: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: 14,
                  padding: "16px 22px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                {generandoPdf ? "Generando PDF..." : "📄 Descargar PDF"}
              </button>

              <Link
                href={`/dashboard/servicio-tecnico/${orden.id}/nuevo-reporte`}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  textDecoration: "none",
                  padding: "16px 22px",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 16,
                  display: "inline-block",
                }}
              >
                + Nuevo Reporte
              </Link>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: "36px 28px",
              border: "1px solid #e2e8f0",
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              {ETAPAS.map((etapa, index) => {
                const completada = index <= etapaActualIndex;

                return (
                  <div
                    key={etapa}
                    style={{
                      flex: 1,
                      minWidth: 90,
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        margin: "0 auto 12px auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: completada ? "#2563eb" : "#e2e8f0",
                        color: completada ? "white" : "#64748b",
                        fontWeight: 700,
                        fontSize: 18,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: completada ? 600 : 500,
                        color: completada ? "#2563eb" : "#94a3b8",
                      }}
                    >
                      {etapa}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 28,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: 24,
                border: "1px solid #e2e8f0",
                padding: 32,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  color: "#64748b",
                  marginBottom: 20,
                }}
              >
                Cliente
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {orden.cliente}
              </div>
            </div>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: 24,
                border: "1px solid #e2e8f0",
                padding: 32,
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  color: "#64748b",
                  marginBottom: 20,
                }}
              >
                Estado actual
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#0f172a",
                }}
              >
                {orden.estado}
              </div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              border: "1px solid #e2e8f0",
              padding: 32,
            }}
          >
            <h2
              style={{
                fontSize: 28,
                margin: "0 0 28px 0",
                color: "#0f172a",
              }}
            >
              Reportes
            </h2>

            {reportes.length === 0 ? (
              <div
                style={{
                  color: "#64748b",
                  fontSize: 18,
                }}
              >
                Todavía no hay reportes para esta orden.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {reportes.map((reporte) => {
                  const fotos = reporte.reporte_fotos || [];
                  const fotoPrincipal = fotos.find((f) => f.es_principal) || fotos[0] || null;
                  const fotosSecundarias = fotos.filter((f) => f.id !== fotoPrincipal?.id);

                  return (
                    <div
                      key={reporte.id}
                      style={{
                        border: "1px solid #dbe4f0",
                        borderRadius: 20,
                        padding: 26,
                        backgroundColor: "#fcfdff",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 16,
                          marginBottom: 18,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <span
                            style={{
                              display: "inline-block",
                              backgroundColor: "#dbeafe",
                              color: "#2563eb",
                              fontWeight: 700,
                              fontSize: 16,
                              padding: "8px 14px",
                              borderRadius: 999,
                            }}
                          >
                            {reporte.etapa}
                          </span>
                        </div>

                        <div
                          style={{
                            color: "#64748b",
                            fontSize: 16,
                          }}
                        >
                          {formatFecha(reporte.created_at)}
                        </div>
                      </div>

                      {reporte.descripcion ? (
                        <div
                          style={{
                            marginBottom: 10,
                            color: "#0f172a",
                            fontSize: 18,
                          }}
                        >
                          {reporte.descripcion}
                        </div>
                      ) : null}

                      {reporte.hallazgos ? (
                        <div
                          style={{
                            marginBottom: 8,
                            fontSize: 18,
                            color: "#0f172a",
                          }}
                        >
                          <strong>Hallazgos:</strong> {reporte.hallazgos}
                        </div>
                      ) : null}

                      {reporte.acciones ? (
                        <div
                          style={{
                            marginBottom: 8,
                            fontSize: 18,
                            color: "#0f172a",
                          }}
                        >
                          <strong>Acciones:</strong> {reporte.acciones}
                        </div>
                      ) : null}

                      {reporte.costo != null ? (
                        <div
                          style={{
                            marginBottom: 12,
                            fontSize: 18,
                            color: "#0f172a",
                          }}
                        >
                          <strong>Costo:</strong> {formatMoneda(reporte.costo)}
                        </div>
                      ) : null}

                      {fotoPrincipal && (
                        <div style={{ marginTop: 16, marginBottom: 18 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#475569",
                              marginBottom: 10,
                            }}
                          >
                            Foto principal
                          </div>

                          <div
                            style={{
                              position: "relative",
                              width: 280,
                              maxWidth: "100%",
                            }}
                          >
                            <img
                              src={fotoPrincipal.foto_url}
                              alt="foto principal"
                              onClick={() => setFotoModal(fotoPrincipal.foto_url)}
                              style={{
                                width: "100%",
                                height: 230,
                                objectFit: "cover",
                                borderRadius: 16,
                                border: "1px solid #dbe4f0",
                                cursor: "pointer",
                                display: "block",
                              }}
                            />

                            <button
                              onClick={() => confirmarEliminarFoto(fotoPrincipal)}
                              disabled={eliminandoFotoId === fotoPrincipal.id}
                              style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 30,
                                height: 30,
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
                                marginTop: 10,
                                fontSize: 16,
                                color: "#475569",
                              }}
                            >
                              <strong>Comentario:</strong> {fotoPrincipal.comentario}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {fotosSecundarias.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#475569",
                              marginBottom: 10,
                            }}
                          >
                            Fotos adicionales
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            {fotosSecundarias.map((foto) => (
                              <div
                                key={foto.id}
                                style={{
                                  width: 150,
                                }}
                              >
                                <div
                                  style={{
                                    position: "relative",
                                    width: 150,
                                    height: 150,
                                  }}
                                >
                                  <img
                                    src={foto.foto_url}
                                    alt="foto reporte"
                                    onClick={() => setFotoModal(foto.foto_url)}
                                    style={{
                                      width: 150,
                                      height: 150,
                                      objectFit: "cover",
                                      borderRadius: 14,
                                      border: "1px solid #dbe4f0",
                                      backgroundColor: "white",
                                      cursor: "pointer",
                                    }}
                                  />

                                  <button
                                    onClick={() => confirmarEliminarFoto(foto)}
                                    disabled={eliminandoFotoId === foto.id}
                                    style={{
                                      position: "absolute",
                                      top: 8,
                                      right: 8,
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      border: "none",
                                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                                      color: "white",
                                      cursor: "pointer",
                                      fontWeight: 700,
                                    }}
                                  >
                                    {eliminandoFotoId === foto.id ? "…" : "×"}
                                  </button>
                                </div>

                                {foto.comentario ? (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      fontSize: 14,
                                      color: "#475569",
                                      lineHeight: 1.35,
                                    }}
                                  >
                                    {foto.comentario}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

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
          padding: 32,
          zIndex: -1,
        }}
      >
        <div ref={pdfRef}>
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              color: "#0f172a",
              backgroundColor: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                marginBottom: 22,
                paddingBottom: 18,
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              <img
                src="/logo.png"
                alt="MJ Industrial"
                style={{
                  height: 64,
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />

              <div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  Informe Técnico
                </div>

                <div
                  style={{
                    fontSize: 14,
                    color: "#64748b",
                  }}
                >
                  Generado {formatFecha(new Date().toISOString())}
                </div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #dbe4f0",
                borderRadius: 14,
                padding: 18,
                marginBottom: 24,
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <strong>Código:</strong> {orden.codigo}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Cliente:</strong> {orden.cliente}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Equipo:</strong> {orden.equipo}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Estado actual:</strong> {orden.estado}
              </div>
              {orden.prioridad ? (
                <div style={{ marginBottom: 8 }}>
                  <strong>Prioridad:</strong> {orden.prioridad}
                </div>
              ) : null}
            </div>

            <h2
              style={{
                fontSize: 22,
                margin: "0 0 16px 0",
              }}
            >
              Reportes
            </h2>

            {reportes.length === 0 ? (
              <div style={{ color: "#475569" }}>
                No hay reportes registrados para esta orden.
              </div>
            ) : (
              reportes.map((reporte) => {
                const fotos = reporte.reporte_fotos || [];
                const fotoPrincipal = fotos.find((f) => f.es_principal) || fotos[0] || null;
                const fotosSecundarias = fotos.filter((f) => f.id !== fotoPrincipal?.id);

                return (
                  <div
                    key={reporte.id}
                    style={{
                      border: "1px solid #dbe4f0",
                      borderRadius: 14,
                      padding: 18,
                      marginBottom: 22,
                      backgroundColor: "#ffffff",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                      display: "block",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 12,
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <strong>Etapa:</strong> {reporte.etapa}
                      </div>
                      <div style={{ color: "#475569" }}>{formatFecha(reporte.created_at)}</div>
                    </div>

                    {reporte.descripcion ? (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Descripción:</strong> {reporte.descripcion}
                      </div>
                    ) : null}

                    {reporte.hallazgos ? (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Hallazgos:</strong> {reporte.hallazgos}
                      </div>
                    ) : null}

                    {reporte.acciones ? (
                      <div style={{ marginBottom: 8 }}>
                        <strong>Acciones:</strong> {reporte.acciones}
                      </div>
                    ) : null}

                    {reporte.costo != null ? (
                      <div style={{ marginBottom: 12 }}>
                        <strong>Costo:</strong> {formatMoneda(reporte.costo)}
                      </div>
                    ) : null}

                    {fotoPrincipal ? (
                      <div
                        style={{
                          marginTop: 12,
                          marginBottom: 16,
                          minHeight: 260,
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 8,
                            fontWeight: 700,
                          }}
                        >
                          Foto principal
                        </div>

                        <div
                          style={{
                            width: "100%",
                            minHeight: 260,
                            border: "1px solid #dbe4f0",
                            borderRadius: 12,
                            backgroundColor: "#ffffff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "visible",
                            padding: 14,
                            boxSizing: "border-box",
                            pageBreakInside: "avoid",
                            breakInside: "avoid",
                          }}
                        >
                          <img
                            src={fotoPrincipal.foto_url}
                            alt="foto principal"
                            style={{
                              maxWidth: "100%",
                              maxHeight: 230,
                              width: "auto",
                              height: "auto",
                              objectFit: "contain",
                              display: "block",
                            }}
                          />
                        </div>

                        {fotoPrincipal.comentario ? (
                          <div style={{ marginTop: 8 }}>
                            <strong>Comentario foto principal:</strong>{" "}
                            {fotoPrincipal.comentario}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {fotosSecundarias.length > 0 ? (
                      <div
                        style={{
                          marginTop: 16,
                          pageBreakInside: "avoid",
                          breakInside: "avoid",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 10,
                            fontWeight: 700,
                          }}
                        >
                          Fotos adicionales
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          {fotosSecundarias.map((foto) => (
                            <div
                              key={foto.id}
                              style={{
                                pageBreakInside: "avoid",
                                breakInside: "avoid",
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  minHeight: 170,
                                  border: "1px solid #dbe4f0",
                                  borderRadius: 10,
                                  backgroundColor: "#ffffff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "visible",
                                  padding: 10,
                                  boxSizing: "border-box",
                                }}
                              >
                                <img
                                  src={foto.foto_url}
                                  alt="foto adicional"
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: 150,
                                    width: "auto",
                                    height: "auto",
                                    objectFit: "contain",
                                    display: "block",
                                  }}
                                />
                              </div>

                              {foto.comentario ? (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 13,
                                    color: "#334155",
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
          </div>
        </div>
      </div>
    </>
  );
}