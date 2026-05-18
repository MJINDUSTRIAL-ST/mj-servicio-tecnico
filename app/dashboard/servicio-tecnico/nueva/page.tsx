"use client";

import Link from "next/link";

export default function NuevaOrdenPage() {
  return (
    <div
      style={{
        padding: 40,
        maxWidth: 1200,
        margin: "0 auto",
      }}
    >
      <Link
        href="/dashboard/servicio-tecnico"
        style={{
          color: "#64748b",
          textDecoration: "none",
          fontSize: 14,
          marginBottom: 24,
          display: "inline-block",
        }}
      >
        ← Volver
      </Link>

      <h1
        style={{
          fontSize: 42,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        Nueva Orden de Servicio
      </h1>

      <p
        style={{
          color: "#64748b",
          marginBottom: 40,
          fontSize: 16,
        }}
      >
        Registrar ingreso de equipo a servicio
        técnico.
      </p>

      <div
        style={{
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 32,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: 20,
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Cliente
            </label>

            <input
              type="text"
              placeholder="Nombre cliente"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Empresa
            </label>

            <input
              type="text"
              placeholder="Empresa"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Producto / Equipo
            </label>

            <input
              type="text"
              placeholder="Ej: Tecle eléctrico"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Capacidad
            </label>

            <input
              type="text"
              placeholder="Ej: 5 Ton"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Nº Serie
            </label>

            <input
              type="text"
              placeholder="Número de serie"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
              }}
            >
              Prioridad
            </label>

            <select style={inputStyle}>
              <option>Media</option>
              <option>Alta</option>
              <option>Urgente</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <label
            style={{
              display: "block",
              marginBottom: 8,
              fontWeight: 600,
            }}
          >
            Observaciones
          </label>

          <textarea
            placeholder="Detalle del problema..."
            style={{
              ...inputStyle,
              minHeight: 140,
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            style={{
              background: "#2563eb",
              color: "white",
              border: "none",
              padding: "14px 24px",
              borderRadius: 12,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Guardar Orden
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  fontSize: 15,
  boxSizing: "border-box" as const,
};