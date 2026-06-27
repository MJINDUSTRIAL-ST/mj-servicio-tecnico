import Link from "next/link";

type HeaderOTProps = {
  codigo?: string | null;
  estado: string;
  prioridad?: string | null;
  fecha?: string | null;
  estadoBadge: {
    bg: string;
    color: string;
  };
  generandoPdf: boolean;
  onGenerarPDF: () => void;
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleString("es-CL");
  } catch {
    return fecha;
  }
}

export default function HeaderOT({
  codigo,
  estado,
  prioridad,
  fecha,
  estadoBadge,
  generandoPdf,
  onGenerarPDF,
}: HeaderOTProps) {
  return (
    <div>
      <Link
        href="/dashboard/servicio-tecnico"
        style={{
          display: "inline-block",
          marginBottom: 18,
          color: "#64748b",
          textDecoration: "none",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        ← Volver al tablero
      </Link>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
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
                fontWeight: 900,
              }}
            >
              {codigo || "Orden"}
            </h1>

            <span
              style={{
                backgroundColor: estadoBadge.bg,
                color: estadoBadge.color,
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {estado}
            </span>

            <span
              style={{
                backgroundColor: "#dbeafe",
                color: "#2563eb",
                padding: "6px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              {prioridad || "Media"}
            </span>
          </div>

          <div
            style={{
              marginTop: 7,
              fontSize: 14,
              color: "#64748b",
              fontWeight: 600,
            }}
          >
            Fecha ingreso: {formatFecha(fecha)}
          </div>
        </div>

        <button
          onClick={onGenerarPDF}
          disabled={generandoPdf}
          style={{
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 12,
            padding: "12px 16px",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 14,
            opacity: generandoPdf ? 0.7 : 1,
          }}
        >
          {generandoPdf ? "Generando..." : "Descargar PDF"}
        </button>
      </header>
    </div>
  );
}