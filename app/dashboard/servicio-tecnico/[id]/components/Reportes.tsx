import Link from "next/link";

type ReporteFoto = {
  id: string;
  foto_url: string;
  storage_path: string | null;
  comentario: string | null;
  orden: number | null;
  es_principal: boolean | null;
};

type ReporteDocumento = {
  id: string;
  nombre: string | null;
  url: string | null;
};

type Reporte = {
  id: string;
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

type Props = {
  ordenId: string;
  reportes: Reporte[];
  eliminandoFotoId: string | null;
  onOpenFoto: (url: string) => void;
  onEliminarFoto: (foto: ReporteFoto) => void;
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleString("es-CL");
}

function formatMoneda(valor?: number | null) {
  if (valor == null) return "-";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function badgeEstado(etapa: string) {
  const e = etapa.toLowerCase();

  if (e.includes("cot")) return { bg: "#fef3c7", color: "#b45309" };
  if (e.includes("listo") || e.includes("entregado")) return { bg: "#dcfce7", color: "#15803d" };
  if (e.includes("repar")) return { bg: "#ffedd5", color: "#c2410c" };
  if (e.includes("mant")) return { bg: "#cffafe", color: "#0e7490" };
  if (e.includes("ingreso")) return { bg: "#e2e8f0", color: "#334155" };

  return { bg: "#dbeafe", color: "#2563eb" };
}

export default function Reportes({
  ordenId,
  reportes,
  eliminandoFotoId,
  onOpenFoto,
  onEliminarFoto,
}: Props) {
  return (
    <section className="card">
      <div className="header">
        <h2>Reportes ({reportes.length})</h2>

        <Link href={`/dashboard/servicio-tecnico/${ordenId}/nuevo-reporte`}>
          Siguiente etapa
        </Link>
      </div>

      {reportes.length === 0 ? (
        <div className="empty">Todavía no hay reportes para esta orden.</div>
      ) : (
        <div className="lista">
          {reportes.map((reporte) => {
            const badge = badgeEstado(reporte.etapa);
            const fotos = reporte.reporte_fotos || [];
            const documentos = reporte.reporte_documentos || [];
            const fotoPrincipal = fotos.find((f) => f.es_principal) || fotos[0] || null;
            const fotosSecundarias = fotos.filter((f) => f.id !== fotoPrincipal?.id);

            return (
              <article key={reporte.id} className="reporte">
                <div className="reporteHeader">
                  <div className="etapaWrap">
                    <span
                      className="badge"
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {reporte.etapa}
                    </span>

                    <Link
                      href={`/dashboard/servicio-tecnico/${ordenId}/reportes/${reporte.id}/editar`}
                      className="editar"
                    >
                      Modificar
                    </Link>
                  </div>

                  <span className="fecha">{formatFecha(reporte.created_at)}</span>
                </div>

                {reporte.tecnico ? (
                  <div className="tecnico">Técnico: {reporte.tecnico}</div>
                ) : null}

                {reporte.descripcion ? (
                  <p className="descripcion">{reporte.descripcion}</p>
                ) : null}

                {reporte.hallazgos ? (
                  <p><strong>Hallazgos:</strong> {reporte.hallazgos}</p>
                ) : null}

                {reporte.acciones ? (
                  <p><strong>Acciones:</strong> {reporte.acciones}</p>
                ) : null}

                {reporte.costo != null ? (
                  <p><strong>Costo:</strong> {formatMoneda(reporte.costo)}</p>
                ) : null}

                {documentos.length > 0 ? (
                  <div className="bloque">
                    <h3>PDFs de la etapa</h3>

                    <div className="documentos">
                      {documentos.map((doc) => (
                        <div key={doc.id} className="documento">
                          <span>{doc.nombre || "Documento PDF"}</span>

                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer">
                              Ver PDF
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {fotoPrincipal ? (
                  <div className="bloque">
                    <h3>Foto principal</h3>

                    <div className="fotoPrincipal">
                      <img
                        src={fotoPrincipal.foto_url}
                        alt="foto reporte"
                        onClick={() => onOpenFoto(fotoPrincipal.foto_url)}
                      />

                      <button
                        onClick={() => onEliminarFoto(fotoPrincipal)}
                        disabled={eliminandoFotoId === fotoPrincipal.id}
                      >
                        {eliminandoFotoId === fotoPrincipal.id ? "…" : "×"}
                      </button>
                    </div>

                    {fotoPrincipal.comentario ? (
                      <div className="comentario">{fotoPrincipal.comentario}</div>
                    ) : null}
                  </div>
                ) : null}

                {fotosSecundarias.length > 0 ? (
                  <div className="bloque">
                    <h3>Fotos adicionales</h3>

                    <div className="fotos">
                      {fotosSecundarias.map((foto) => (
                        <div key={foto.id} className="foto">
                          <img
                            src={foto.foto_url}
                            alt="foto adicional"
                            onClick={() => onOpenFoto(foto.foto_url)}
                          />

                          <button
                            onClick={() => onEliminarFoto(foto)}
                            disabled={eliminandoFotoId === foto.id}
                          >
                            {eliminandoFotoId === foto.id ? "…" : "×"}
                          </button>

                          {foto.comentario ? (
                            <div className="comentarioMini">{foto.comentario}</div>
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

      <style jsx>{`
        .card {
          background: white;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          margin-bottom: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        h2 {
          font-size: 18px;
          margin: 0;
          color: #0f172a;
        }

        .header a {
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 11px 16px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 14px;
        }

        .empty {
          color: #64748b;
          font-size: 14px;
        }

        .lista {
          display: grid;
          gap: 14px;
        }

        .reporte {
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 16px;
          background: #f8fafc;
        }

        .reporteHeader {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .etapaWrap {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .badge {
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 900;
        }

        .editar {
          background: #f59e0b;
          color: white;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 10px;
          font-weight: 900;
          font-size: 12px;
        }

        .fecha,
        .tecnico {
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
        }

        p {
          margin: 0 0 7px;
          color: #334155;
          font-size: 14px;
          line-height: 1.5;
        }

        .descripcion {
          font-weight: 800;
          color: #0f172a;
        }

        .bloque {
          margin-top: 13px;
        }

        h3 {
          font-size: 13px;
          color: #475569;
          font-weight: 900;
          margin: 0 0 8px;
        }

        .documentos {
          display: grid;
          gap: 8px;
        }

        .documento {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          background: white;
          font-size: 13px;
          color: #334155;
          font-weight: 800;
        }

        .documento a {
          background: #2563eb;
          color: white;
          text-decoration: none;
          padding: 7px 10px;
          border-radius: 8px;
          font-weight: 900;
          font-size: 12px;
        }

        .fotoPrincipal {
          position: relative;
          width: 150px;
          height: 150px;
        }

        .fotoPrincipal img {
          width: 150px;
          height: 150px;
          object-fit: contain;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          background: white;
        }

        .fotoPrincipal button,
        .foto button {
          position: absolute;
          top: 6px;
          right: 6px;
          border-radius: 50%;
          border: none;
          background: rgba(15, 23, 42, 0.85);
          color: white;
          cursor: pointer;
          font-weight: 900;
        }

        .fotoPrincipal button {
          width: 26px;
          height: 26px;
        }

        .fotos {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .foto {
          position: relative;
          width: 100px;
        }

        .foto img {
          width: 100px;
          height: 100px;
          object-fit: cover;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          background: white;
        }

        .foto button {
          width: 22px;
          height: 22px;
          font-size: 12px;
        }

        .comentario {
          margin-top: 8px;
          color: #475569;
          font-size: 13px;
        }

        .comentarioMini {
          margin-top: 5px;
          color: #475569;
          font-size: 11px;
        }
      `}</style>
    </section>
  );
}