"use client";

import { useRouter } from "next/navigation";

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

type Props = {
  equipos: EquipoLote[];
};

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Ingreso";
  const e = estado.toLowerCase();

  if (e.includes("entregado")) return "Entregado";
  if (e.includes("listo")) return "Listo";
  if (e.includes("trabajo") || e.includes("reparación") || e.includes("reparacion")) return "Trabajo";
  if (e.includes("cotización") || e.includes("cotizacion")) return "Cotización";
  if (e.includes("jefe") || e.includes("aprobado")) return "Revisión";
  if (e.includes("diagnóstico") || e.includes("diagnostico")) return "Diagnóstico";
  if (e.includes("checklist") || e.includes("revisión") || e.includes("revision")) return "Checklist";

  return "Ingreso";
}

function colorEstado(estado: string) {
  if (estado === "Entregado" || estado === "Listo") return { bg: "#dcfce7", color: "#15803d" };
  if (estado === "Trabajo") return { bg: "#dcfce7", color: "#15803d" };
  if (estado === "Cotización") return { bg: "#fef3c7", color: "#b45309" };
  if (estado === "Revisión") return { bg: "#fef3c7", color: "#b45309" };
  if (estado === "Diagnóstico") return { bg: "#ede9fe", color: "#6d28d9" };
  if (estado === "Checklist") return { bg: "#e0f2fe", color: "#0369a1" };

  return { bg: "#dbeafe", color: "#2563eb" };
}

export default function EquiposLote({ equipos }: Props) {
  const router = useRouter();

  if (!equipos.length) {
    return (
      <section className="box">
        <h2>Equipos del lote</h2>
        <p>No se encontraron equipos hijos asociados a esta OT.</p>

        <style jsx>{`
          .box {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 18px;
            padding: 18px;
            margin-bottom: 18px;
          }

          h2 {
            margin: 0 0 8px;
            color: #111827;
            font-size: 18px;
          }

          p {
            margin: 0;
            color: #6b7280;
            font-size: 14px;
          }
        `}</style>
      </section>
    );
  }

  return (
    <section className="box">
      <div className="head">
        <div>
          <h2>Equipos del lote</h2>
          <p>Cada equipo tiene su propio checklist, diagnóstico, revisión y trabajo.</p>
        </div>

        <span className="count">{equipos.length} equipos</span>
      </div>

      <div className="grid">
        {equipos.map((equipo) => {
          const estado = normalizarEstado(equipo.estado);
          const color = colorEstado(estado);

          return (
            <article
              key={equipo.id}
              className="card"
              onClick={() => router.push(`/dashboard/servicio-tecnico/${equipo.id}`)}
            >
              <div className="top">
                <strong>{equipo.codigo || "Equipo sin código"}</strong>

                <span
                  className="badge"
                  style={{
                    backgroundColor: color.bg,
                    color: color.color,
                  }}
                >
                  {estado}
                </span>
              </div>

              <div className="equipo">{equipo.equipo || "Equipo sin tipo"}</div>

              <div className="meta">
                {[equipo.marca, equipo.modelo, equipo.numero_serie]
                  .filter(Boolean)
                  .join(" · ") || "Sin marca/modelo/serie"}
              </div>

              {equipo.problema_reportado && (
                <p className="problema">{equipo.problema_reportado}</p>
              )}

              <button type="button">Abrir equipo</button>
            </article>
          );
        })}
      </div>

      <style jsx>{`
        .box {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          margin-bottom: 18px;
        }

        .head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        h2 {
          margin: 0;
          color: #111827;
          font-size: 20px;
        }

        p {
          margin: 6px 0 0;
          color: #6b7280;
          font-size: 14px;
        }

        .count {
          background: #eef2ff;
          color: #3730a3;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .card {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 16px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .card:hover {
          background: #f3f4f6;
          transform: translateY(-1px);
        }

        .top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 10px;
        }

        strong {
          color: #111827;
          font-size: 15px;
        }

        .badge {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .equipo {
          color: #111827;
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 5px;
        }

        .meta {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.4;
        }

        .problema {
          margin-top: 10px;
          background: white;
          border-radius: 10px;
          padding: 9px;
          color: #4b5563;
          font-size: 13px;
          line-height: 1.4;
        }

        button {
          margin-top: 12px;
          width: 100%;
          border: none;
          border-radius: 12px;
          background: #2563eb;
          color: white;
          padding: 10px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        @media (max-width: 800px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .head {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
}