"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type HistorialEstado = {
  estado: string;
  tecnico: string;
  fecha: string;
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

const ESTADOS = [
  "Cotizada",
  "Aprobada",
  "Lista para despacho",
  "Despachado",
  "Entregado",
];

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Cotizada";
  if (estado === "Pendiente") return "Cotizada";
  if (estado === "Completada") return "Entregado";
  return estado;
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
  if (actual === "Lista para despacho") return { bg: "#dcfce7", color: "#15803d" };
  if (actual === "Despachado") return { bg: "#e0e7ff", color: "#4338ca" };
  if (actual === "Entregado") return { bg: "#bbf7d0", color: "#166534" };

  return { bg: "#e2e8f0", color: "#334155" };
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
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);

  const [producto, setProducto] = useState("");
  const [detalle, setDetalle] = useState("");

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
    setLoading(false);
  }

  const estadoActual = normalizarEstado(venta?.estado);

  const siguienteEstado = useMemo(() => {
    const index = ESTADOS.indexOf(estadoActual);
    if (index < 0 || index >= ESTADOS.length - 1) return null;
    return ESTADOS[index + 1];
  }, [estadoActual]);

  async function avanzarEstado() {
    if (!venta?.id || !siguienteEstado) return;

    const tecnico = prompt("Nombre del técnico o vendedor responsable:");

    if (!tecnico) {
      alert("Debes ingresar el nombre del responsable.");
      return;
    }

    setGuardando(true);

    const historialActual = Array.isArray(venta.historial_estados)
      ? venta.historial_estados
      : [];

    const nuevoHistorial: HistorialEstado[] = [
      ...historialActual,
      {
        estado: siguienteEstado,
        tecnico,
        fecha: new Date().toISOString(),
      },
    ];

    const { data, error } = await supabase
      .from("ventas")
      .update({
        estado: siguienteEstado,
        tecnico_responsable: tecnico,
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
      alert(
        "No se actualizó ninguna fila en Supabase. Revisa que el ID de la URL exista en la tabla ventas."
      );
      setGuardando(false);
      return;
    }

    const ventaActualizada = data[0] as Venta;

    setVenta(ventaActualizada);
    setProducto(ventaActualizada.producto || ventaActualizada.descripcion || "");
    setDetalle(ventaActualizada.detalle || "");
    setGuardando(false);
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

  const badge = badgeEstado(venta.estado);

  const documentos = [
    { label: "Factura", url: venta.factura_url },
    { label: "Orden de Compra", url: venta.orden_compra_url },
    { label: "Certificado", url: venta.certificado_url },
    { label: "Documento", url: venta.documento_url },
  ].filter((doc) => doc.url);

  const historial = Array.isArray(venta.historial_estados)
    ? venta.historial_estados
    : [];

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        padding: "32px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
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
            ✏️ {editando ? "Cancelar" : "Editar"}
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
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 18 }}>📦 Producto / Equipo</h2>

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
              {estadoActual}
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
                <label style={{ fontWeight: 800, fontSize: 13 }}>Detalle</label>
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
              <Campo label="Producto" value={venta.producto || venta.descripcion} />
              <Campo label="Detalle" value={venta.detalle} />
              <Campo label="Estado" value={estadoActual} />
              <Campo label="Responsable actual" value={venta.tecnico_responsable} />
            </div>
          )}
        </section>

        <section
          style={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>👤 Cliente</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <Campo label="Cliente" value={venta.cliente} />
            <Campo label="Email" value={venta.cliente_email} />
          </div>
        </section>

        <section
          style={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 18,
            padding: 22,
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>📄 Documentos</h2>

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
            <h2 style={{ margin: "0 0 16px", fontSize: 18 }}>🖼️ Imagen</h2>

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
            🕓 Historial de etapas
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
                        {item.estado}
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
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginTop: 20,
          }}
        >
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Flujo: Cotizada → Aprobada → Lista para despacho → Despachado → Entregado
          </div>

          <button
            onClick={avanzarEstado}
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
                ? `→ Siguiente etapa: ${siguienteEstado}`
                : "Venta entregada"}
          </button>
        </section>
      </div>
    </main>
  );
}