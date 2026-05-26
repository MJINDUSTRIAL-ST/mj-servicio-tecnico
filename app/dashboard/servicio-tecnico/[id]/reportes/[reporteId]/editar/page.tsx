"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../../../lib/supabase";

type Reporte = {
  id: string;
  orden_id: string;
  etapa: string;
  descripcion: string | null;
  hallazgos: string | null;
  acciones: string | null;
  costo: number | null;
};

export default function EditarReportePage() {
  const router = useRouter();
  const params = useParams();

  const ordenId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const reporteId = Array.isArray(params.reporteId)
    ? params.reporteId[0]
    : params.reporteId;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [etapa, setEtapa] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [hallazgos, setHallazgos] = useState("");
  const [acciones, setAcciones] = useState("");
  const [costo, setCosto] = useState("");

  useEffect(() => {
    cargarReporte();
  }, []);

  async function cargarReporte() {
    const { data, error } = await supabase
      .from("reportes")
      .select("*")
      .eq("id", reporteId)
      .single();

    if (error || !data) {
      alert("No se pudo cargar el reporte");
      router.push(
        `/dashboard/servicio-tecnico/${ordenId}`
      );
      return;
    }

    setEtapa(data.etapa || "");
    setDescripcion(data.descripcion || "");
    setHallazgos(data.hallazgos || "");
    setAcciones(data.acciones || "");
    setCosto(data.costo?.toString() || "");

    setLoading(false);
  }

  async function guardarCambios() {
    setGuardando(true);

    const { error } = await supabase
      .from("reportes")
      .update({
        etapa,
        descripcion,
        hallazgos,
        acciones,
        costo: costo ? Number(costo) : null,
      })
      .eq("id", reporteId);

    setGuardando(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Reporte actualizado");

    router.push(
      `/dashboard/servicio-tecnico/${ordenId}`
    );
  }

  if (loading) {
    return (
      <main style={{ padding: 40 }}>
        Cargando reporte...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 32,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <Link
          href={`/dashboard/servicio-tecnico/${ordenId}`}
          style={{
            display: "inline-block",
            marginBottom: 20,
            textDecoration: "none",
            color: "#2563eb",
            fontWeight: 700,
          }}
        >
          ← Volver a la orden
        </Link>

        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: 30,
            border: "1px solid #e2e8f0",
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: 25,
              color: "#0f172a",
            }}
          >
            ✏️ Modificar reporte
          </h1>

          <div
            style={{
              display: "grid",
              gap: 20,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Etapa
              </label>

              <select
                value={etapa}
                onChange={(e) =>
                  setEtapa(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              >
                <option value="Ingreso">
                  Ingreso
                </option>
                <option value="Revisión">
                  Revisión
                </option>
                <option value="Cotización">
                  Cotización
                </option>
                <option value="Mantenimiento">
                  Mantenimiento
                </option>
                <option value="Reparación">
                  Reparación
                </option>
                <option value="Listo">
                  Listo
                </option>
                <option value="Entregado">
                  Entregado
                </option>
              </select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Descripción
              </label>

              <textarea
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(e.target.value)
                }
                rows={4}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Hallazgos
              </label>

              <textarea
                value={hallazgos}
                onChange={(e) =>
                  setHallazgos(e.target.value)
                }
                rows={4}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Acciones realizadas
              </label>

              <textarea
                value={acciones}
                onChange={(e) =>
                  setAcciones(e.target.value)
                }
                rows={4}
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: 8,
                  fontWeight: 700,
                }}
              >
                Costo
              </label>

              <input
                type="number"
                value={costo}
                onChange={(e) =>
                  setCosto(e.target.value)
                }
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #cbd5e1",
                }}
              />
            </div>

            <button
              onClick={guardarCambios}
              disabled={guardando}
              style={{
                background: "#2563eb",
                color: "white",
                border: "none",
                padding: 16,
                borderRadius: 14,
                fontWeight: 800,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}