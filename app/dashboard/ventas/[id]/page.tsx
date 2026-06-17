"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type HistorialEstado = {
  estado: string;
  tecnico: string;
  fecha: string;
  comentario?: string | null;
  pdf_url?: string | null;
  pdf_nombre?: string | null;
  foto_url?: string | null;
  foto_nombre?: string | null;
};

type Venta = {
  id: string;
  codigo?: string | null;
  numero?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  producto?: string | null;
  descripcion?: string | null;
  detalle?: string | null;
  estado?: string | null;
  fecha?: string | null;
  fecha_venta?: string | null;
  created_at?: string | null;
  factura_url?: string | null;
  orden_compra_url?: string | null;
  certificado_url?: string | null;
  documento_url?: string | null;
  imagen_url?: string | null;
  tecnico_responsable?: string | null;
  historial_estados?: HistorialEstado[] | null;
};

type Retiro = {
  id: string;
  tipo?: string | null;
  referencia_id?: string | null;
  cliente_email?: string | null;
  producto_equipo?: string | null;
  fecha_retiro?: string | null;
  hora_retiro?: string | null;
  fecha_retirado?: string | null;
  observaciones?: string | null;
  estado?: string | null;
  created_at?: string | null;
};

const ESTADOS_DESPACHO = [
  "Cotizada",
  "Aprobada",
  "Lista para despacho",
  "Despachado",
  "Entregado",
];

const ESTADOS_RETIRO = [
  "Cotizada",
  "Aprobada",
  "Lista para despacho",
  "Retiro agendado",
  "Entregado",
];

const PERSONAL_TECNICO = [
  "Eduardo Vergara",
  "Gustavo Santana",
  "Francisco Romero",
  "Gustavo Blanco",
  "Andrés Berdejo",
  "Jessirel Díaz",
  "Sergio González",
  "Álvaro Quezada",
  "Roberto Ramírez",
];

const STORAGE_BUCKET = "ventas";

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Cotizada";
  if (estado === "Pendiente") return "Cotizada";
  if (estado === "Completada") return "Entregado";
  if (estado === "Lista para despacho/retiro") return "Lista para despacho";
  return estado;
}

function mostrarEstado(estado?: string | null) {
  if (estado === "Lista para despacho") return "Lista para despacho/retiro";
  return estado || "-";
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return fecha;
  }
}

function badgeEstado(estado?: string | null) {
  const actual = normalizarEstado(estado);

  if (actual === "Cotizada") return { bg: "#fef3c7", color: "#b45309" };
  if (actual === "Aprobada") return { bg: "#dbeafe", color: "#2563eb" };
  if (actual === "Lista para despacho")
    return { bg: "#dcfce7", color: "#15803d" };
  if (actual === "Retiro agendado")
    return { bg: "#fef9c3", color: "#a16207" };
  if (actual === "Despachado") return { bg: "#e0e7ff", color: "#4338ca" };
  if (actual === "Entregado") return { bg: "#bbf7d0", color: "#166534" };

  return { bg: "#e2e8f0", color: "#334155" };
}

function limpiarNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-")
    .toLowerCase();
}

function Campo({ label, value }: { label: string; value?: string | null }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 20 }}>
      <strong style={{ color: "#64748b" }}>{label}:</strong>
      <span style={{ color: "#0f172a", textAlign: "right" }}>
        {value || "-"}
      </span>
    </div>
  );
}

export default function DetalleVentaPage() {
  const params = useParams();
  const router = useRouter();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [venta, setVenta] = useState<Venta | null>(null);
  const [retiro, setRetiro] = useState<Retiro | null>(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [mostrarFormularioAvance, setMostrarFormularioAvance] = useState(false);

  const [producto, setProducto] = useState("");
  const [detalle, setDetalle] = useState("");

  const [responsableEtapa, setResponsableEtapa] = useState("");
  const [comentarioEtapa, setComentarioEtapa] = useState("");
  const [pdfEtapa, setPdfEtapa] = useState<File | null>(null);
  const [fotoEtapa, setFotoEtapa] = useState<File | null>(null);

  useEffect(() => {
    cargarVenta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function cargarVenta() {
    if (!id) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .eq("id", id)
      .limit(1);

    if (error) {
      alert("Error cargando venta: " + error.message);
      setVenta(null);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setVenta(null);
      setLoading(false);
      return;
    }

    const ventaData = data[0] as Venta;

    setVenta(ventaData);
    setProducto(ventaData.producto || ventaData.descripcion || "");
    setDetalle(ventaData.detalle || "");

    const { data: retiroData } = await supabase
      .from("retiros")
      .select("*")
      .eq("tipo", "venta")
      .eq("referencia_id", ventaData.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (retiroData && retiroData.length > 0) {
      setRetiro(retiroData[0] as Retiro);
    } else {
      setRetiro(null);
    }

    setLoading(false);
  }

  const estadoBase = normalizarEstado(venta?.estado);

  const estadoActual =
    retiro?.estado === "Agendado"
      ? "Retiro agendado"
      : retiro?.estado === "Retirado"
        ? "Entregado"
        : estadoBase;

  const estadosFlujo =
    retiro?.estado === "Agendado" || retiro?.estado === "Retirado"
      ? ESTADOS_RETIRO
      : ESTADOS_DESPACHO;

  const siguienteEstado = useMemo(() => {
    const index = estadosFlujo.indexOf(estadoActual);

    if (index < 0 || index >= estadosFlujo.length - 1) return null;

    return estadosFlujo[index + 1];
  }, [estadoActual, estadosFlujo]);

  async function subirArchivoEtapa(
    archivo: File | null,
    tipo: "pdf" | "foto"
  ): Promise<{ url: string; nombre: string } | null> {
    if (!archivo || !venta?.id || !siguienteEstado) return null;

    const timestamp = Date.now();
    const nombreLimpio = limpiarNombreArchivo(archivo.name);
    const estadoLimpio = limpiarNombreArchivo(siguienteEstado);
    const ruta = `${venta.id}/${estadoLimpio}/${tipo}-${timestamp}-${nombreLimpio}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(ruta, archivo, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `No se pudo subir el archivo ${archivo.name}: ${error.message}`
      );
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(ruta);

    return {
      url: data.publicUrl,
      nombre: archivo.name,
    };
  }

  async function enviarCorreoVenta(
    ventaActualizada: Venta,
    pdfSubido?: { url: string; nombre: string } | null,
    fotoSubida?: { url: string; nombre: string } | null
  ) {
    if (!ventaActualizada.cliente_email || !siguienteEstado) return;

    try {
      const response = await fetch("/api/enviar-correo-venta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: ventaActualizada.cliente_email,
          cliente: ventaActualizada.cliente || "Cliente",
          numeroVenta:
            ventaActualizada.codigo ||
            ventaActualizada.numero ||
            ventaActualizada.id,
          estado: mostrarEstado(siguienteEstado),
          comentario: comentarioEtapa.trim() || "",
          pdfUrl: pdfSubido?.url || "",
          pdfNombre: pdfSubido?.nombre || "",
          fotoUrl: fotoSubida?.url || "",
          fotoNombre: fotoSubida?.nombre || "",
        }),
      });

      if (!response.ok) {
        alert(
          "La venta se actualizó, pero no se pudo enviar el correo automático."
        );
      }
    } catch (error) {
      console.error("Error enviando correo:", error);
      alert(
        "La venta se actualizó, pero ocurrió un error al enviar el correo automático."
      );
    }
  }

  function limpiarFormularioAvance() {
    setResponsableEtapa("");
    setComentarioEtapa("");
    setPdfEtapa(null);
    setFotoEtapa(null);
    setMostrarFormularioAvance(false);

    const pdfInput = document.getElementById(
      "pdf-etapa"
    ) as HTMLInputElement | null;
    const fotoInput = document.getElementById(
      "foto-etapa"
    ) as HTMLInputElement | null;

    if (pdfInput) pdfInput.value = "";
    if (fotoInput) fotoInput.value = "";
  }

  async function guardarYAvanzarEstado() {
    if (!venta?.id || !siguienteEstado) return;

    if (!responsableEtapa) {
      alert("Debes seleccionar un responsable.");
      return;
    }

    setGuardando(true);

    try {
      const pdfSubido = await subirArchivoEtapa(pdfEtapa, "pdf");
      const fotoSubida = await subirArchivoEtapa(fotoEtapa, "foto");

      const historialActual = Array.isArray(venta.historial_estados)
        ? venta.historial_estados
        : [];

      const nuevoHistorial: HistorialEstado[] = [
        ...historialActual,
        {
          estado: siguienteEstado,
          tecnico: responsableEtapa,
          fecha: new Date().toISOString(),
          comentario: comentarioEtapa.trim() || null,
          pdf_url: pdfSubido?.url || null,
          pdf_nombre: pdfSubido?.nombre || null,
          foto_url: fotoSubida?.url || null,
          foto_nombre: fotoSubida?.nombre || null,
        },
      ];

      const { data, error } = await supabase
        .from("ventas")
        .update({
          estado: siguienteEstado,
          tecnico_responsable: responsableEtapa,
          historial_estados: nuevoHistorial,
        })
        .eq("id", venta.id)
        .select("*");

      if (error) {
        alert("No se pudo actualizar el estado: " + error.message);
        setGuardando(false);
        return;
      }

      if (!data || data.length === 0) {
        alert("No se actualizó ninguna fila en Supabase.");
        setGuardando(false);
        return;
      }

      if (retiro?.estado === "Agendado" && siguienteEstado === "Entregado") {
        await supabase
          .from("retiros")
          .update({
            estado: "Retirado",
            fecha_retirado: new Date().toISOString(),
          })
          .eq("id", retiro.id);
      }

      const ventaActualizada = data[0] as Venta;

      await enviarCorreoVenta(ventaActualizada, pdfSubido, fotoSubida);

      setVenta(ventaActualizada);
      setProducto(ventaActualizada.producto || ventaActualizada.descripcion || "");
      setDetalle(ventaActualizada.detalle || "");
      await cargarVenta();
      limpiarFormularioAvance();
      setGuardando(false);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : "Error desconocido al guardar.";
      alert(mensaje);
      setGuardando(false);
    }
  }

  async function guardarCambios() {
    if (!venta?.id) return;

    setGuardando(true);

    const { data, error } = await supabase
      .from("ventas")
      .update({
        producto,
        descripcion: producto,
        detalle,
      })
      .eq("id", venta.id)
      .select("*");

    if (error) {
      alert("No se pudo guardar: " + error.message);
      setGuardando(false);
      return;
    }

    if (!data || data.length === 0) {
      alert("No se actualizó ninguna fila.");
      setGuardando(false);
      return;
    }

    const ventaActualizada = data[0] as Venta;

    setVenta(ventaActualizada);
    setProducto(ventaActualizada.producto || ventaActualizada.descripcion || "");
    setDetalle(ventaActualizada.detalle || "");
    setEditando(false);
    setGuardando(false);
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Cargando venta...</main>;
  }

  if (!venta) {
    return (
      <main style={{ padding: 32 }}>
        <Link href="/dashboard/ventas">← Volver</Link>
        <h1>Venta no encontrada</h1>
      </main>
    );
  }

  const badge = badgeEstado(estadoActual);

  const documentos = [
    { label: "Factura", url: venta.factura_url },
    { label: "Orden de Compra", url: venta.orden_compra_url },
    { label: "Certificado", url: venta.certificado_url },
    { label: "Documento", url: venta.documento_url },
  ].filter((doc) => doc.url);

  const historial = Array.isArray(venta.historial_estados)
    ? venta.historial_estados
    : [];

  const pasoActual = Math.max(estadosFlujo.indexOf(estadoActual), 0);

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <button
          onClick={() => router.push("/dashboard/ventas")}
          style={{
            border: "none",
            background: "transparent",
            color: "#64748b",
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 18,
          }}
        >
          ← Volver a ventas
        </button>

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
            <h1 style={{ margin: 0, fontSize: 28, color: "#0f172a" }}>
              {venta.codigo || venta.numero || "Venta"}
            </h1>

            <div style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>
              {venta.cliente || "-"} ·{" "}
              {formatFecha(venta.fecha_venta || venta.fecha || venta.created_at)}
            </div>
          </div>

          <button
            onClick={() => setEditando((prev) => !prev)}
            style={{
              backgroundColor: "white",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {editando ? "Cancelar" : "Editar"}
          </button>
        </header>

        <section
          style={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18 }}>Producto / Equipo</h2>

                <span
                  style={{
                    backgroundColor: badge.bg,
                    color: badge.color,
                    padding: "7px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {mostrarEstado(estadoActual)}
                </span>
              </div>

              {editando ? (
                <div style={{ display: "grid", gap: 14 }}>
                  <div>
                    <label style={{ fontWeight: 800, fontSize: 13 }}>
                      Producto
                    </label>
                    <input
                      value={producto}
                      onChange={(e) => setProducto(e.target.value)}
                      style={{
                        width: "100%",
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        marginTop: 6,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontWeight: 800, fontSize: 13 }}>
                      Detalle
                    </label>
                    <textarea
                      value={detalle}
                      onChange={(e) => setDetalle(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: 100,
                        padding: 12,
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        marginTop: 6,
                      }}
                    />
                  </div>

                  <button
                    onClick={guardarCambios}
                    disabled={guardando}
                    style={{
                      backgroundColor: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: 12,
                      padding: "13px 18px",
                      fontWeight: 900,
                      cursor: guardando ? "not-allowed" : "pointer",
                    }}
                  >
                    {guardando ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <Campo
                    label="Producto"
                    value={venta.producto || venta.descripcion}
                  />
                  <Campo label="Detalle" value={venta.detalle} />
                  <Campo
                    label="Responsable actual"
                    value={venta.tecnico_responsable}
                  />
                </div>
              )}

              <div style={{ marginTop: 30 }}>
                <h3
                  style={{
                    margin: "0 0 18px",
                    fontSize: 15,
                    color: "#334155",
                  }}
                >
                  Avance de venta
                </h3>

                <div style={{ position: "relative", padding: "10px 0 4px" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 19,
                      height: 4,
                      backgroundColor: "#e2e8f0",
                      borderRadius: 999,
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 19,
                      height: 4,
                      width: `${((pasoActual + 1) / estadosFlujo.length) * 100}%`,
                      backgroundColor: "#f97316",
                      borderRadius: 999,
                    }}
                  />

                  <div
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: `repeat(${estadosFlujo.length}, 1fr)`,
                    }}
                  >
                    {estadosFlujo.map((estado, index) => {
                      const activo = index <= pasoActual;

                      return (
                        <div
                          key={estado}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            textAlign: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              backgroundColor: activo ? "#f97316" : "#cbd5e1",
                              border: "4px solid white",
                              boxShadow: "0 0 0 1px #e2e8f0",
                            }}
                          />

                          <span
                            style={{
                              marginTop: 10,
                              fontSize: 11,
                              fontWeight: activo ? 700 : 500,
                              color: activo ? "#0f172a" : "#94a3b8",
                            }}
                          >
                            {mostrarEstado(estado)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: 18,
              }}
            >
              <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Cliente</h2>

              <div style={{ display: "grid", gap: 10 }}>
                <Campo label="Cliente" value={venta.cliente} />
                <Campo label="Email" value={venta.cliente_email} />
              </div>
            </div>
          </div>
        </section>

        {retiro ? (
          <section
            style={{
              backgroundColor: retiro.estado === "Retirado" ? "#ecfdf5" : "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 18,
              padding: 22,
              marginBottom: 18,
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18, color: "#166534" }}>
              {retiro.estado === "Retirado"
                ? "Producto retirado / entregado"
                : "Retiro agendado"}
            </h2>

            <div style={{ display: "grid", gap: 10 }}>
              <Campo label="Producto" value={retiro.producto_equipo} />
              <Campo label="Fecha retiro" value={retiro.fecha_retiro} />
              <Campo label="Hora retiro" value={retiro.hora_retiro} />
              <Campo label="Estado" value={retiro.estado} />
              <Campo label="Observaciones" value={retiro.observaciones} />
              {retiro.fecha_retirado ? (
                <Campo label="Retirado el" value={formatFecha(retiro.fecha_retirado)} />
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          style={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Documentos</h2>

          {documentos.length === 0 ? (
            <div style={{ color: "#64748b" }}>No hay documentos adjuntos.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {documentos.map((doc) => (
                <a
                  key={doc.label}
                  href={doc.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "13px 15px",
                    textDecoration: "none",
                    color: "#0f172a",
                    fontWeight: 800,
                  }}
                >
                  <span>{doc.label}</span>
                  <span style={{ color: "#2563eb" }}>Ver documento →</span>
                </a>
              ))}
            </div>
          )}
        </section>

        {venta.imagen_url ? (
          <section
            style={{
              backgroundColor: "white",
              border: "1px solid #e2e8f0",
              borderRadius: 18,
              padding: 22,
              marginBottom: 18,
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>Imagen</h2>

            <img
              src={venta.imagen_url}
              alt="Imagen venta"
              style={{
                maxWidth: "100%",
                maxHeight: 260,
                objectFit: "contain",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
              }}
            />
          </section>
        ) : null}

        <section
          style={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
            Historial de etapas
          </h2>

          {historial.length === 0 ? (
            <div style={{ color: "#64748b" }}>
              Aún no hay cambios de etapa registrados.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {historial.map((item, index) => {
                const itemBadge = badgeEstado(item.estado);

                return (
                  <div
                    key={`${item.estado}-${item.fecha}-${index}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      borderRadius: 14,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          backgroundColor: itemBadge.bg,
                          color: itemBadge.color,
                          padding: "6px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {mostrarEstado(item.estado)}
                      </span>

                      <span style={{ color: "#64748b", fontSize: 12 }}>
                        {formatFecha(item.fecha)}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#0f172a",
                        fontWeight: 700,
                      }}
                    >
                      Responsable: {item.tecnico || "-"}
                    </div>

                    {item.comentario ? (
                      <div
                        style={{
                          marginTop: 8,
                          color: "#334155",
                          fontSize: 14,
                        }}
                      >
                        Comentario: {item.comentario}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {mostrarFormularioAvance && siguienteEstado ? (
          <section
            style={{
              backgroundColor: "white",
              border: "2px solid #2563eb",
              borderRadius: 18,
              padding: 22,
              marginBottom: 18,
            }}
          >
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>
              Avanzar a etapa: {mostrarEstado(siguienteEstado)}
            </h2>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <label style={{ fontWeight: 800, fontSize: 13 }}>
                  Responsable técnico / vendedor
                </label>

                <select
                  value={responsableEtapa}
                  onChange={(e) => setResponsableEtapa(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    marginTop: 6,
                    backgroundColor: "white",
                  }}
                >
                  <option value="">Seleccionar responsable</option>
                  {PERSONAL_TECNICO.map((nombre) => (
                    <option key={nombre} value={nombre}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontWeight: 800, fontSize: 13 }}>
                  Comentario de la etapa
                </label>

                <textarea
                  value={comentarioEtapa}
                  onChange={(e) => setComentarioEtapa(e.target.value)}
                  placeholder="Ej: Cliente aprobó por correo, retiro coordinado, producto entregado, etc."
                  style={{
                    width: "100%",
                    minHeight: 90,
                    padding: 12,
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    marginTop: 6,
                  }}
                />
              </div>

              <button
                onClick={guardarYAvanzarEstado}
                disabled={guardando}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: 12,
                  padding: "13px 18px",
                  fontWeight: 900,
                  cursor: guardando ? "not-allowed" : "pointer",
                }}
              >
                {guardando ? "Guardando..." : "Guardar y avanzar"}
              </button>
            </div>
          </section>
        ) : null}

        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>
            Flujo despacho: Cotizada → Aprobada → Lista para despacho/retiro → Despachado → Entregado
            <br />
            Flujo retiro: Cotizada → Aprobada → Lista para despacho/retiro → Retiro agendado → Entregado
          </div>

          <button
            onClick={() => {
              if (siguienteEstado) setMostrarFormularioAvance(true);
            }}
            disabled={!siguienteEstado || guardando}
            style={{
              backgroundColor: siguienteEstado ? "#2563eb" : "#94a3b8",
              color: "white",
              border: "none",
              borderRadius: 12,
              padding: "14px 20px",
              fontWeight: 900,
              cursor: siguienteEstado && !guardando ? "pointer" : "not-allowed",
            }}
          >
            {guardando
              ? "Guardando..."
              : siguienteEstado
                ? estadoActual === "Retiro agendado"
                  ? "→ Marcar como entregado"
                  : `→ Siguiente etapa: ${mostrarEstado(siguienteEstado)}`
                : "Venta entregada"}
          </button>
        </section>
      </div>
    </main>
  );
}