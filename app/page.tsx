"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #050505 0%, #0f172a 100%)",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Overlay oscuro */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, rgba(0,0,0,0.55) 75%)",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          position: "relative",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <img
            src="/logo-mj.png"
            alt="MJ Industrial"
            style={{
              width: 280,
              maxWidth: "85%",
              height: "auto",
              objectFit: "contain",
              display: "block",
              filter:
                "drop-shadow(0px 6px 18px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        {/* Texto superior */}
        <div
          style={{
            color: "#f59e0b",
            fontWeight: 700,
            letterSpacing: 2.5,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          PORTAL DE SERVICIO TÉCNICO
        </div>

        {/* TITULO CORREGIDO */}
        <h1
          style={{
            fontSize: "clamp(34px, 4.6vw, 56px)",
            lineHeight: 1.08,
            fontWeight: 800,
            margin: "0 auto",
            maxWidth: 760,
            marginBottom: 18,
            letterSpacing: "-1px",
          }}
        >
          Seguimiento de órdenes y
          <br />
          servicios en línea
        </h1>

        {/* Subtítulo */}
        <p
          style={{
            fontSize: 18,
            color: "#d1d5db",
            maxWidth: 760,
            margin: "0 auto",
            lineHeight: 1.65,
            marginBottom: 34,
          }}
        >
          Consulta el estado de tus equipos,
          revisa avances del servicio técnico y
          mantén toda la información
          centralizada en un solo lugar.
        </p>

        {/* Botones */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 14,
            flexWrap: "wrap",
            marginBottom: 42,
          }}
        >
          <Link
            href="/cliente"
            style={{
              background: "#f97316",
              color: "white",
              padding: "14px 30px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
              boxShadow:
                "0 10px 24px rgba(249,115,22,0.28)",
            }}
          >
            Soy Cliente
          </Link>

          <Link
            href="/personal"
            style={{
              border:
                "1px solid rgba(255,255,255,0.14)",
              background:
                "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              color: "white",
              padding: "14px 30px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            Personal MJ Industrial
          </Link>
        </div>

        {/* Cards inferiores */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background:
                "rgba(255,255,255,0.05)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 22,
              padding: 24,
              textAlign: "left",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontWeight: 700,
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              Órdenes
            </div>

            <h3
              style={{
                fontSize: 26,
                marginBottom: 8,
              }}
            >
              Seguimiento claro
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
                fontSize: 15,
              }}
            >
              Visualiza el estado actual de cada
              equipo en servicio técnico.
            </p>
          </div>

          <div
            style={{
              background:
                "rgba(255,255,255,0.05)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 22,
              padding: 24,
              textAlign: "left",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontWeight: 700,
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              Evidencia
            </div>

            <h3
              style={{
                fontSize: 26,
                marginBottom: 8,
              }}
            >
              Fotos y avances
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
                fontSize: 15,
              }}
            >
              Revisa imágenes,
              observaciones y actualizaciones
              del proceso.
            </p>
          </div>

          <div
            style={{
              background:
                "rgba(255,255,255,0.05)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 22,
              padding: 24,
              textAlign: "left",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontWeight: 700,
                marginBottom: 8,
                fontSize: 14,
              }}
            >
              Acceso
            </div>

            <h3
              style={{
                fontSize: 26,
                marginBottom: 8,
              }}
            >
              Portal para clientes
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
                fontSize: 15,
              }}
            >
              Cada cliente podrá consultar
              únicamente sus propias órdenes.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}