
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: string;
  prioridad: string;
  created_at: string;
};

const estadosFiltro = [
  "Todas",
  "Ingreso",
  "Revisión",
  "Cotización",
  "Mantenimiento",
  "Reparación",
  "Listo",
  "Entregado",
];

function colorEstado(estado: string) {
  const e = (estado || "").toLowerCase();

  if (e.includes("ingreso")) return { fondo: "#dbeafe", texto: "#1d4ed8" };
  if (e.includes("revisión") || e.includes("revision")) {
    return { fondo: "#ede9fe", texto: "#6d28d9" };
  }
  if (e.includes("cotización") || e.includes("cotizacion")) {
    return { fondo: "#fef3c7", texto: "#b45309" };
  }
  if (e.includes("mantenimiento")) {
    return { fondo: "#dcfce7", texto: "#15803d" };
  }
  if (e.includes("reparación") || e.includes("reparacion")) {
    return { fondo: "#fee2e2", texto: "#b91c1c" };
  }
  if (e.includes("listo")) return { fondo: "#dcfce7", texto: "#166534" };
  if (e.includes("entregado")) return { fondo: "#e5e7eb", texto: "#374151" };

  return { fondo: "#e5e7eb", texto: "#374151" };
}

function colorPrioridad(prioridad: string) {
  const p = (prioridad || "").toLowerCase();

  if (p.includes("alta")) return { fondo: "#fee2e2", texto: "#b91c1c" };
  if (p.includes("media")) return { fondo: "#dbeafe", texto: "#1d4ed8" };
  if (p.includes("baja")) return { fondo: "#dcfce7", texto: "#166534" };

  return { fondo: "#e5e7eb", texto: "#374151" };
}

function formatearFecha(fecha: string) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

export default function ServicioTecnico() {
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("Todas");



  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/personal");
        return;
      }

      const email = sessionData.session.user.email;

      if (email !== "personal@mjindustrial.cl") {
        router.push("/personal");
        return;
      }

      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) {
        setOrdenes(data || []);
      }

      setLoading(false);
    };

    checkAuthAndFetch();
  }, [router]);

  const ordenesFiltradas = useMemo(() => {
    if (filtroEstado === "Todas") return ordenes;

    return ordenes.filter((orden) =>
      String(orden.estado || "").toLowerCase().includes(filtroEstado.toLowerCase())
    );
  }, [ordenes, filtroEstado]);

  const totalActivas = ordenes.filter(
    (o) => !String(o.estado || "").toLowerCase().includes("entregado")
  ).length;

  const totalListas = ordenes.filter((o) =>
    String(o.estado || "").toLowerCase().includes("listo")
  ).length;

  const totalUrgentes = ordenes.filter((o) =>
    String(o.prioridad || "").toLowerCase().includes("alta")
  ).length;

  const totalClientes = new Set(
    ordenes.map((o) => (o.cliente || "").trim()).filter(Boolean)
  ).size;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: 250,
          backgroundColor: "#0f172a",
          color: "white",
          padding: "20px 16px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 20,
        }}
      >
        <div>
          <div
            style={{
              marginBottom: 28,
              padding: "6px 8px",
            }}
          >
            <div
              style={{
                display: "inline-block",
                backgroundColor: "white",
                padding: "8px 10px",
                borderRadius: 8,
              }}
            >
              <img
                src="/logo.png"
                alt="MJ Industrial"
                style={{
                  height: 26,
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <a
              href="/dashboard/servicio-tecnico"
              style={{
                textDecoration: "none",
                backgroundColor: "#2563eb",
                color: "white",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Dashboard
            </a>

            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#cbd5e1",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                textAlign: "left",
                cursor: "default",
              }}
            >
              Clientes
            </button>

            <a
              href="/dashboard/servicio-tecnico"
              style={{
                textDecoration: "none",
                color: "#cbd5e1",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
              }}
            >
              Servicio Técnico
            </a>

            <button
              type="button"
              style={{
                background: "none",
                border: "none",
                color: "#cbd5e1",
                padding: "12px 14px",
                borderRadius: 10,
                fontWeight: 500,
                fontSize: 14,
                textAlign: "left",
                cursor: "default",
              }}
            >
              Ventas
            </button>
          </div>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/personal");
          }}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#cbd5e1",
            padding: "12px 14px",
            borderRadius: 10,
            cursor: "pointer",
            textAlign: "left",
            fontSize: 14,
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main
        style={{
          marginLeft: 250,
          minHeight: "100vh",
          padding: 28,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 20,
            marginBottom: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 32,
                color: "#111827",
              }}
            >
              Dashboard
            </h1>
            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              PRUEBA 123 MJ
            </p>
          </div>

          <a href="/dashboard/servicio-tecnico/nueva">
            <button
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: 12,
                padding: "12px 18px",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 14,
                boxShadow: "0 10px 20px rgba(37,99,235,0.18)",
              }}
            >
              + Ingresar nueva orden
            </button>
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
              Órdenes activas
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>
              {totalActivas}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
              Clientes
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>
              {totalClientes}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
              Listas entrega
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>
              {totalListas}
            </div>
          </div>

          <div
            style={{
              backgroundColor: "white",
              borderRadius: 18,
              padding: 18,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
              Urgentes
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>
              {totalUrgentes}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: "white",
            borderRadius: 20,
            border: "1px solid #e5e7eb",
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 22,
                color: "#111827",
              }}
            >
              Órdenes recientes
            </h2>

            <a
              href="/dashboard/servicio-tecnico"
              style={{
                textDecoration: "none",
                color: "#2563eb",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Ver todas
            </a>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            {estadosFiltro.map((estado) => {
              const activo = filtroEstado === estado;

              return (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  style={{
                    border: activo ? "none" : "1px solid #d1d5db",
                    backgroundColor: activo ? "#2563eb" : "#f9fafb",
                    color: activo ? "white" : "#374151",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {estado}
                </button>
              );
            })}
          </div>

          {loading ? (
            <div
              style={{
                padding: "20px 6px",
                color: "#6b7280",
              }}
            >
              Cargando órdenes...
            </div>
          ) : ordenesFiltradas.length === 0 ? (
            <div
              style={{
                padding: "20px 6px",
                color: "#6b7280",
              }}
            >
              No hay órdenes para este filtro.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {ordenesFiltradas.map((orden) => {
                const estadoStyle = colorEstado(orden.estado);
                const prioridadStyle = colorPrioridad(orden.prioridad);

                return (
                  <div
                    key={orden.id}
                    onClick={() => {
                      window.location.href = `/dashboard/servicio-tecnico/${orden.id}`;
                    }}
                    style={{
                      border: "1px solid #eef2f7",
                      backgroundColor: "#fbfdff",
                      borderRadius: 16,
                      padding: 16,
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color: "#111827",
                            marginBottom: 6,
                          }}
                        >
                          {orden.codigo || "Sin código"}
                        </div>

                        <div
                          style={{
                            color: "#374151",
                            fontSize: 14,
                            marginBottom: 4,
                          }}
                        >
                          {orden.cliente || "-"}
                        </div>

                        <div
                          style={{
                            color: "#6b7280",
                            fontSize: 14,
                          }}
                        >
                          {orden.equipo || "-"}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "right",
                          minWidth: 120,
                        }}
                      >
                        <div
                          style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        >
                          {formatearFecha(orden.created_at)}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: estadoStyle.fondo,
                              color: estadoStyle.texto,
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {orden.estado}
                          </span>

                          <span
                            style={{
                              backgroundColor: prioridadStyle.fondo,
                              color: prioridadStyle.texto,
                              borderRadius: 999,
                              padding: "6px 10px",
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {orden.prioridad}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}