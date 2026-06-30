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
  estado: string;
  prioridad: string | null;
  created_at: string;
  cantidad_equipos?: number | null;
};

const COLUMNAS = [
  "Ingreso",
  "Checklist",
  "Diagnóstico",
  "Revisión",
  "Cotización",
  "Trabajo",
  "Listo",
  "Entregado",
];

function esOrdenHija(codigo?: string | null) {
  if (!codigo) return false;
  return /-\d{2}$/.test(codigo);
}

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

  if (e.includes("jefe") || e.includes("aprobado")) return "Revisión";

  if (e.includes("diagnóstico") || e.includes("diagnostico")) {
    return "Diagnóstico";
  }

  if (
    e.includes("checklist") ||
    e.includes("revisión") ||
    e.includes("revision")
  ) {
    return "Checklist";
  }

  if (e.includes("ingreso")) return "Ingreso";

  return "Ingreso";
}

function diasDesde(fecha?: string | null) {
  if (!fecha) return "-";

  const inicio = new Date(fecha).getTime();
  const hoy = new Date().getTime();
  const dias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));

  if (dias <= 0) return "Hoy";
  if (dias === 1) return "1 día";
  return `${dias} días`;
}

function colorPrioridad(prioridad?: string | null) {
  const p = String(prioridad || "").toLowerCase();

  if (p.includes("alta")) return { bg: "#fee2e2", color: "#b91c1c" };
  if (p.includes("baja")) return { bg: "#dcfce7", color: "#166534" };

  return { bg: "#dbeafe", color: "#1d4ed8" };
}

export default function ServicioTecnicoPage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargarOrdenes() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/personal");
        return;
      }

      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) setOrdenes((data || []) as Orden[]);
      setLoading(false);
    }

    cargarOrdenes();
  }, [router]);

  const ordenesMadre = useMemo(() => {
    return ordenes.filter((orden) => !esOrdenHija(orden.codigo));
  }, [ordenes]);

  const columnas = useMemo(() => {
    return COLUMNAS.map((columna) => ({
      nombre: columna,
      ordenes: ordenesMadre.filter(
        (orden) => normalizarEstado(orden.estado) === columna
      ),
    }));
  }, [ordenesMadre]);

  const totalActivas = ordenesMadre.filter(
    (orden) => normalizarEstado(orden.estado) !== "Entregado"
  ).length;

  const totalChecklist = ordenesMadre.filter(
    (orden) => normalizarEstado(orden.estado) === "Checklist"
  ).length;

  const totalDiagnostico = ordenesMadre.filter(
    (orden) => normalizarEstado(orden.estado) === "Diagnóstico"
  ).length;

  const totalTrabajo = ordenesMadre.filter(
    (orden) => normalizarEstado(orden.estado) === "Trabajo"
  ).length;

  return (
    <div className="page">
      <Sidebar />

      <main className="main">
        <header className="header">
          <div>
            <h1>Servicio Técnico</h1>
            <p>Tablero general de órdenes de servicio.</p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/dashboard/servicio-tecnico/nueva")}
            className="primaryButton"
          >
            + Nueva OT
          </button>
        </header>

        <section className="summaryGrid">
          <SummaryCard title="OT activas" value={totalActivas} />
          <SummaryCard title="En checklist" value={totalChecklist} />
          <SummaryCard title="En diagnóstico" value={totalDiagnostico} />
          <SummaryCard title="En trabajo" value={totalTrabajo} />
        </section>

        {loading ? (
          <div className="loading">Cargando órdenes...</div>
        ) : (
          <section className="kanban">
            {columnas.map((columna) => (
              <div key={columna.nombre} className="column">
                <div className="columnHeader">
                  <h2>{columna.nombre}</h2>
                  <span>{columna.ordenes.length}</span>
                </div>

                <div className="cards">
                  {columna.ordenes.length === 0 ? (
                    <div className="empty">Sin OT</div>
                  ) : (
                    columna.ordenes.map((orden) => (
                      <OrderCard
                        key={orden.id}
                        orden={orden}
                        onClick={() =>
                          router.push(`/dashboard/servicio-tecnico/${orden.id}`)
                        }
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: #f3f4f6;
          font-family: Arial, sans-serif;
        }

        .main {
          margin-left: 180px;
          min-height: 100vh;
          padding: 28px;
          box-sizing: border-box;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 22px;
          flex-wrap: wrap;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          color: #111827;
        }

        p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .primaryButton {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 18px;
          font-weight: 800;
          cursor: pointer;
          font-size: 14px;
          box-shadow: 0 10px 20px rgba(37, 99, 235, 0.16);
        }

        .summaryGrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }

        .loading {
          color: #6b7280;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
        }

        .kanban {
          display: grid;
          grid-template-columns: repeat(8, minmax(180px, 1fr));
          gap: 14px;
          align-items: flex-start;
          overflow-x: auto;
          padding-bottom: 14px;
        }

        .column {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 12px;
          min-height: 280px;
        }

        .columnHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .columnHeader h2 {
          margin: 0;
          color: #111827;
          font-size: 14px;
        }

        .columnHeader span {
          background: #f3f4f6;
          color: #374151;
          border-radius: 999px;
          padding: 4px 9px;
          font-size: 12px;
          font-weight: 800;
        }

        .cards {
          display: grid;
          gap: 10px;
        }

        .empty {
          color: #9ca3af;
          text-align: center;
          font-size: 13px;
          padding: 18px 6px;
        }

        @media (max-width: 900px) {
          .main {
            margin-left: 0;
            padding: 72px 16px 20px;
          }

          .summaryGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .kanban {
            grid-template-columns: repeat(8, 220px);
          }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="summaryCard">
      <div className="summaryTitle">{title}</div>
      <div className="summaryValue">{value}</div>

      <style jsx>{`
        .summaryCard {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 10px;
        }

        .summaryTitle {
          color: #6b7280;
          font-size: 13px;
          margin-bottom: 8px;
        }

        .summaryValue {
          color: #111827;
          font-size: 28px;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}

function OrderCard({ orden, onClick }: { orden: Orden; onClick: () => void }) {
  const prioridad = colorPrioridad(orden.prioridad);
  const esLote = Number(orden.cantidad_equipos || 1) > 1;

  return (
    <article className="card" onClick={onClick}>
      <div className="codigo">{orden.codigo || "Sin código"}</div>
      <div className="cliente">{orden.cliente || "-"}</div>

      <div className="equipo">
        {esLote
          ? `Lote de ${orden.cantidad_equipos} equipos`
          : orden.equipo || "-"}
      </div>

      {esLote && <div className="loteBadge">OT madre / lote</div>}

      <div className="footer">
        <span
          style={{
            backgroundColor: prioridad.bg,
            color: prioridad.color,
          }}
          className="badge"
        >
          {orden.prioridad || "Media"}
        </span>

        <span className="dias">{diasDesde(orden.created_at)}</span>
      </div>

      <style jsx>{`
        .card {
          background: #f9fafb;
          border: 1px solid #eef2f7;
          border-radius: 14px;
          padding: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .card:hover {
          background: #f3f4f6;
          transform: translateY(-1px);
        }

        .codigo {
          color: #111827;
          font-size: 14px;
          font-weight: 900;
          margin-bottom: 7px;
        }

        .cliente {
          color: #374151;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .equipo {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.35;
          min-height: 34px;
        }

        .loteBadge {
          display: inline-block;
          margin-top: 8px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 900;
        }

        .footer {
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .badge {
          border-radius: 999px;
          padding: 5px 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .dias {
          color: #9ca3af;
          font-size: 11px;
          font-weight: 800;
        }
      `}</style>
    </article>
  );
}