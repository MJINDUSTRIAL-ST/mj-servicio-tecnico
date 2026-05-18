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
            "radial-gradient(circle at center, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.55) 70%)",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          position: "relative",
          zIndex: 2,
          textAlign: "center",
        }}
      >
        {/* LOGO SIN RECTÁNGULO BLANCO */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <img
            src="/logo-mj.png"
            alt="MJ Industrial"
            style={{
              width: 420,
              maxWidth: "90%",
              height: "auto",
              objectFit: "contain",
              filter:
                "drop-shadow(0px 8px 20px rgba(0,0,0,0.35))",
            }}
          />
        </div>

        {/* Texto superior */}
        <div
          style={{
            color: "#f59e0b",
            fontWeight: 700,
            letterSpacing: 3,
            fontSize: 14,
            marginBottom: 18,
          }}
        >
          PORTAL DE SERVICIO TÉCNICO
        </div>

        {/* Título */}
        <h1
          style={{
            fontSize: "clamp(42px, 7vw, 74px)",
            lineHeight: 1.05,
            fontWeight: 800,
            margin: "0 auto",
            maxWidth: 900,
            marginBottom: 22,
          }}
        >
          Seguimiento de órdenes y
          <br />
          servicios en línea
        </h1>

        {/* Descripción */}
        <p
          style={{
            fontSize: 20,
            color: "#d1d5db",
            maxWidth: 900,
            margin: "0 auto",
            lineHeight: 1.7,
            marginBottom: 38,
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
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 56,
          }}
        >
          <Link
            href="/cliente"
            style={{
              background: "#f97316",
              color: "white",
              padding: "16px 34px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 18,
              boxShadow:
                "0 10px 25px rgba(249,115,22,0.35)",
            }}
          >
            Soy Cliente
          </Link>

          <Link
            href="/personal"
            style={{
              border:
                "1px solid rgba(255,255,255,0.18)",
              background:
                "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
              color: "white",
              padding: "16px 34px",
              borderRadius: 14,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 18,
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
              "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          <div
            style={{
              background:
                "rgba(255,255,255,0.06)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 22,
              padding: 28,
              textAlign: "left",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Órdenes
            </div>

            <h3
              style={{
                fontSize: 28,
                marginBottom: 10,
              }}
            >
              Seguimiento claro
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
              }}
            >
              Visualiza el estado actual de cada
              equipo en servicio técnico.
            </p>
          </div>

          <div
            style={{
              background:
                "rgba(255,255,255,0.06)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 22,
              padding: 28,
              textAlign: "left",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Evidencia
            </div>

            <h3
              style={{
                fontSize: 28,
                marginBottom: 10,
              }}
            >
              Fotos y avances
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
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
                "rgba(255,255,255,0.06)",
              border:
                "1px solid rgba(255,255,255,0.08)",
              borderRadius: 22,
              padding: 28,
              textAlign: "left",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                color: "#f59e0b",
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Acceso
            </div>

            <h3
              style={{
                fontSize: 28,
                marginBottom: 10,
              }}
            >
              Portal para clientes
            </h3>

            <p
              style={{
                color: "#cbd5e1",
                lineHeight: 1.6,
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