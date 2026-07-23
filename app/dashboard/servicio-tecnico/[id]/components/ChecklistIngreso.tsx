"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Props = {
  ordenId: string;
  soloLectura?: boolean;
};

type ChecklistIngresoJson = Record<string, boolean>;

type ItemIngreso = {
  id: string;
  label: string;
  grupo: "Recepción" | "Accesorios" | "Evidencia";
};

const ITEMS_INGRESO: ItemIngreso[] = [
  { id: "equipo_limpio", label: "Equipo limpio", grupo: "Recepción" },
  {
    id: "cable_alimentacion",
    label: "Cable de alimentación",
    grupo: "Recepción",
  },
  { id: "cadena", label: "Cadena", grupo: "Recepción" },
  { id: "manual_recibido", label: "Manual recibido", grupo: "Recepción" },
  { id: "equipo_energiza", label: "Equipo energiza", grupo: "Recepción" },
  {
    id: "accesorios_completos",
    label: "Accesorios completos",
    grupo: "Accesorios",
  },
  { id: "gancho", label: "Gancho", grupo: "Accesorios" },
  { id: "control_remoto", label: "Control remoto", grupo: "Accesorios" },
  { id: "embalaje", label: "Embalaje", grupo: "Accesorios" },
  {
    id: "fotografias_tomadas",
    label: "Fotografías tomadas",
    grupo: "Evidencia",
  },
];

function crearChecklistVacio() {
  return ITEMS_INGRESO.reduce<ChecklistIngresoJson>((acc, item) => {
    acc[item.id] = false;
    return acc;
  }, {});
}

export default function ChecklistIngreso({
  ordenId,
  soloLectura = false,
}: Props) {
  const [valores, setValores] = useState<ChecklistIngresoJson>(() =>
    crearChecklistVacio(),
  );
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  const grupos = useMemo(() => {
    return ITEMS_INGRESO.reduce<Record<string, ItemIngreso[]>>((acc, item) => {
      if (!acc[item.grupo]) acc[item.grupo] = [];
      acc[item.grupo].push(item);
      return acc;
    }, {});
  }, []);

  useEffect(() => {
    cargarChecklistIngreso();
  }, [ordenId]);

  async function cargarChecklistIngreso() {
    setCargando(true);
    setError("");

    const { data, error: errorCarga } = await supabase
      .from("ordenes")
      .select("checklist_ingreso_json")
      .eq("id", ordenId)
      .single();

    if (errorCarga) {
      setError(
        errorCarga.message ||
          "No se pudo cargar el checklist de ingreso. Revisa que exista la columna checklist_ingreso_json.",
      );
      setCargando(false);
      return;
    }

    const checklistGuardado =
      data?.checklist_ingreso_json &&
      typeof data.checklist_ingreso_json === "object"
        ? data.checklist_ingreso_json
        : {};

    setValores({
      ...crearChecklistVacio(),
      ...checklistGuardado,
    });

    setCargando(false);
  }

  async function guardarChecklist(nuevoValor: ChecklistIngresoJson) {
    if (soloLectura) return;

    setGuardando(true);
    setGuardado(false);
    setError("");

    const { error: errorGuardar } = await supabase
      .from("ordenes")
      .update({ checklist_ingreso_json: nuevoValor })
      .eq("id", ordenId);

    setGuardando(false);

    if (errorGuardar) {
      setError(
        errorGuardar.message || "No se pudo guardar el checklist de ingreso.",
      );
      return;
    }

    setGuardado(true);

    window.setTimeout(() => {
      setGuardado(false);
    }, 1800);
  }

  function cambiarItem(itemId: string) {
    if (soloLectura) return;

    const nuevoValor = {
      ...valores,
      [itemId]: !valores[itemId],
    };

    setValores(nuevoValor);
    void guardarChecklist(nuevoValor);
  }

  const totalMarcados = Object.values(valores).filter(Boolean).length;

  return (
    <section className={`card ${soloLectura ? "readOnly" : ""}`}>
      <div className="header">
        <div>
          <h2>Checklist de ingreso</h2>
          <p>
            {soloLectura
              ? "Este registro de recepción ya fue guardado y se encuentra bloqueado."
              : "Registro rápido de recepción. Se guarda automáticamente al marcar o desmarcar cada ítem."}
          </p>
        </div>

        <span className="badge">
          {totalMarcados}/{ITEMS_INGRESO.length}
        </span>
      </div>

      {cargando ? (
        <p className="muted">Cargando checklist de ingreso...</p>
      ) : (
        <>
          <div className="grid">
            {Object.entries(grupos).map(([grupo, items]) => (
              <div key={grupo} className="grupo">
                <h3>{grupo}</h3>

                {items.map((item) => (
                  <label
                    key={item.id}
                    className={`item ${soloLectura ? "itemReadOnly" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(valores[item.id])}
                      onChange={() => cambiarItem(item.id)}
                      disabled={soloLectura || guardando}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>

          <div className="estadoGuardado">
            {soloLectura && <strong>Etapa guardada</strong>}
            {!soloLectura && guardando && <span>Guardando...</span>}
            {!soloLectura && guardado && <strong>Guardado</strong>}
            {error && <em>{error}</em>}
          </div>
        </>
      )}

      <style jsx>{`
        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          padding: 18px;
          margin-top: 18px;
        }

        .card.readOnly {
          background: #f8fafc;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }

        h2 {
          margin: 0 0 6px;
          color: #111827;
          font-size: 18px;
        }

        p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }

        .badge {
          background: #eff6ff;
          color: #2563eb;
          border-radius: 999px;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .grupo {
          border: 1px solid #eef2f7;
          border-radius: 14px;
          padding: 12px;
          background: #f8fafc;
        }

        h3 {
          margin: 0 0 10px;
          color: #334155;
          font-size: 13px;
          font-weight: 900;
        }

        .item {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 8px 0;
          color: #334155;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .itemReadOnly {
          cursor: default;
        }

        input {
          width: 16px;
          height: 16px;
          accent-color: #2563eb;
        }

        input:disabled {
          opacity: 1;
          cursor: default;
        }

        .estadoGuardado {
          min-height: 22px;
          margin-top: 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .estadoGuardado span {
          color: #64748b;
        }

        .estadoGuardado strong {
          color: #15803d;
        }

        .estadoGuardado em {
          color: #b91c1c;
          font-style: normal;
        }

        .muted {
          color: #64748b;
        }

        @media (max-width: 820px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
