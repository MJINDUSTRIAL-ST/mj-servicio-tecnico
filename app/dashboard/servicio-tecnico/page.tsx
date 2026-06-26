"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import Sidebar from "../../components/Sidebar";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  cantidad_equipos?: number | null;
  estado: string;
  prioridad: string;
  created_at: string;
};

const columnasKanban = [
  "Ingreso",
  "Diagnóstico técnico",
  "Revisión jefe técnico",
  "Diagnóstico aprobado",
  "Cotización interna",
  "Enviado a Comercial",
  "Trabajo en proceso",
  "Control de calidad",
  "Listo",
  "Entregado",
];

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Ingreso";

  const e = estado.toLowerCase();

  if (e.includes("diagnóstico") || e.includes("diagnostico")) {
    return "Diagnóstico técnico";
  }

  if (e.includes("jefe")) {
    return "Revisión jefe técnico";
  }

  if (e.includes("aprobado")) {
    return "Diagnóstico aprobado";
  }

  if (e.includes("cotización interna") || e.includes("cotizacion interna")) {
    return "Cotización interna";
  }

  if (e.includes("comercial")) {
    return "Enviado a Comercial";
  }

  if (
    e.includes("trabajo") ||
    e.includes("mantenimiento") ||
    e.includes("reparación") ||
    e.includes("reparacion")
  ) {
    return "Trabajo en proceso";
  }

  if (e.includes("calidad")) {
    return "Control de calidad";
  }

  if (e.includes("listo")) return "Listo";
  if (e.includes("entregado")) return "Entregado";
  if (e.includes("ingreso")) return "Ingreso";
  if (e.includes("revisión") || e.includes("revision")) return "Diagnóstico técnico";
  if (e.includes("cotización") || e.includes("cotizacion")) return "Cotización interna";

  return "Ingreso";
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

function diasDesde(fecha: string) {
  if (!fecha) return "-";

  const inicio = new Date(fecha).getTime();
  const hoy = new Date().getTime();
  const dias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));

  if (dias <= 0) return "Hoy";
  if (dias === 1) return "1 día";
  return `${dias} días`;
}

function esOrdenHija(codigo?: string | null) {
  if (!codigo) return false;
  return /-\d{2}$/.test(codigo);
}

export default function ServicioTecnico() {
  const router = useRouter();

  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

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

  const ordenesMadre = useMemo(() => {
  return ordenes.filter((orden) => !esOrdenHija(orden.codigo));
}, [ordenes]);

const ordenesPorColumna = useMemo(() => {
  return columnasKanban.map((columna) => {
    const items = ordenesMadre.filter(
      (orden) => normalizarEstado(orden.estado) === columna
    );

    return {
      estado: columna,
      ordenes: items,
    };
  });
}, [ordenesMadre]);

  const totalActivas = ordenesMadre.filter(
  (o) => normalizarEstado(o.estado) !== "Entregado"
).length;

const totalListas = ordenesMadre.filter(
  (o) => normalizarEstado(o.estado) === "Listo"
).length;

const totalUrgentes = ordenesMadre.filter((o) =>
  String(o.prioridad || "").toLowerCase().includes("alta")
).length;

const totalClientes = new Set(
  ordenesMadre.map((o) => (o.cliente || "").trim()).filter(Boolean)
).size;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <Sidebar />

      <main
        style={{
          marginLeft: 260,
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
            <h1 style={{ margin: 0, fontSize: 32, color: "#111827" }}>
              Servicio Técnico
            </h1>

            <p
              style={{
                marginTop: 6,
                marginBottom: 0,
                color: "#6b7280",
                fontSize: 14,
              }}
            >
              Tablero de órdenes de servicio.
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
              + Ingresar nueva OT
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
          <CardResumen titulo="Órdenes activas" valor={totalActivas} />
          <CardResumen titulo="Clientes" valor={totalClientes} />
          <CardResumen titulo="Listas entrega" valor={totalListas} />
          <CardResumen titulo="Urgentes" valor={totalUrgentes} />
        </div>

        {loading ? (
          <div style={{ color: "#6b7280" }}>Cargando órdenes...</div>
        ) : (
          <div
            style={{
              display: "flex",
              gap: 16,
              overflowX: "auto",
              paddingBottom: 16,
            }}
          >
            {ordenesPorColumna.map((columna) => (
              <section
                key={columna.estado}
                style={{
                  minWidth: 285,
                  maxWidth: 285,
                  backgroundColor: "#ffffff",
                  borderRadius: 18,
                  border: "1px solid #e5e7eb",
                  padding: 14,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 15,
                      color: "#111827",
                    }}
                  >
                    {columna.estado}
                  </h2>

                  <span
                    style={{
                      backgroundColor: "#f3f4f6",
                      color: "#374151",
                      borderRadius: 999,
                      padding: "4px 9px",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {columna.ordenes.length}
                  </span>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {columna.ordenes.length === 0 ? (
                    <div
                      style={{
                        color: "#9ca3af",
                        fontSize: 13,
                        padding: "18px 8px",
                        textAlign: "center",
                      }}
                    >
                      Sin órdenes
                    </div>
                  ) : (
                    columna.ordenes.map((orden) => {
                      const prioridadStyle = colorPrioridad(orden.prioridad);

                      return (
                        <article
                          key={orden.id}
                          onClick={() =>
                            router.push(`/dashboard/servicio-tecnico/${orden.id}`)
                          }
                          style={{
                            backgroundColor: "#f9fafb",
                            border: "1px solid #eef2f7",
                            borderRadius: 14,
                            padding: 14,
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: 15,
                              color: "#111827",
                              marginBottom: 8,
                            }}
                          >
                            {orden.codigo || "Sin código"}
                          </div>

                          <div
                            style={{
                              color: "#374151",
                              fontSize: 13,
                              marginBottom: 4,
                              fontWeight: 600,
                            }}
                          >
                            {orden.cliente || "-"}
                          </div>

                          <div
                            style={{
                              color: "#6b7280",
                              fontSize: 13,
                              marginBottom: 12,
                            }}
                          >
                            {orden.equipo || "-"}
                            {orden.cantidad_equipos ? (
  <div
    style={{
      color: "#2563eb",
      fontSize: 12,
      fontWeight: 800,
      marginTop: 6,
    }}
  >
    {orden.cantidad_equipos} equipo(s)
  </div>
) : null}
                          </div>

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                backgroundColor: prioridadStyle.fondo,
                                color: prioridadStyle.texto,
                                borderRadius: 999,
                                padding: "5px 9px",
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {orden.prioridad || "Media"}
                            </span>

                            <span
                              style={{
                                color: "#9ca3af",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {diasDesde(orden.created_at)}
                            </span>
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              color: "#9ca3af",
                              fontSize: 11,
                            }}
                          >
                            Ingreso: {formatearFecha(orden.created_at)}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CardResumen({ titulo, valor }: { titulo: string; valor: number }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: 18,
        padding: 18,
        border: "1px solid #e5e7eb",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 8 }}>
        {titulo}
      </div>

      <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>
        {valor}
      </div>
    </div>
  );
}