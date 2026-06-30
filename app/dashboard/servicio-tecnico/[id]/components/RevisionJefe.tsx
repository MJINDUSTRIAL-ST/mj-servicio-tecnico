"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Props = {
  ordenId: string;
  onEstadoActualizado?: (estado: string) => void;
};

export default function RevisionJefe({ ordenId, onEstadoActualizado }: Props) {
  const [idRevision, setIdRevision] = useState<string | null>(null);
  const [estado, setEstado] = useState<"Aprobado" | "Rechazado" | "">("");
  const [motivo, setMotivo] = useState("");
  const [horas, setHoras] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [repuestos, setRepuestos] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    cargarRevision();
  }, [ordenId]);

  async function cargarRevision() {
    const { data } = await supabase
      .from("revisiones_jefe")
      .select("*")
      .eq("orden_id", ordenId)
      .maybeSingle();

    if (!data) return;

    setIdRevision(data.id);
    setEstado(data.aprobado === true ? "Aprobado" : "Rechazado");
    setMotivo(data.motivo || "");
    setHoras(data.horas_hombre?.toString() || "");
    setProcedimiento(data.procedimiento_aprobado || "");
    setRepuestos(data.repuestos_aprobados || "");
  }

  async function guardar() {
    if (!estado) {
      alert("Debes aprobar o rechazar la revisión.");
      return;
    }

    if (estado === "Rechazado" && !motivo.trim()) {
      alert("Debes indicar el motivo del rechazo.");
      return;
    }

    setGuardando(true);
    setGuardadoOk(false);

    try {
      const datos = {
        orden_id: ordenId,
        aprobado: estado === "Aprobado",
        motivo,
        horas_hombre: horas ? Number(horas) : null,
        procedimiento_aprobado: procedimiento,
        repuestos_aprobados: repuestos,
        updated_at: new Date().toISOString(),
      };

      if (idRevision) {
        const { error } = await supabase
          .from("revisiones_jefe")
          .update(datos)
          .eq("id", idRevision);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("revisiones_jefe")
          .insert(datos)
          .select()
          .single();

        if (error) throw error;
        setIdRevision(data.id);
      }

      const nuevoEstado = estado === "Aprobado" ? "Cotización" : "Diagnóstico";

      const { error: errorOrden } = await supabase
        .from("ordenes")
        .update({ estado: nuevoEstado })
        .eq("id", ordenId);

      if (errorOrden) throw errorOrden;

     await supabase
  .from("ordenes")
  .update({
    estado: "cotizacion",
  })
  .eq("id", ordenId);

onEstadoActualizado?.("cotizacion");
      setGuardadoOk(true);
      setTimeout(() => setGuardadoOk(false), 2500);
    } catch (e: any) {
      alert(e.message || "No se pudo guardar la revisión");
    } finally {
      setGuardando(false);
    }
  }

  const textoBoton = guardando
    ? "Guardando..."
    : guardadoOk
    ? "✓ Revisión guardada"
    : idRevision
    ? "Modificar revisión"
    : "Guardar revisión";

  return (
    <section className="card">
      <div className="header">
        <div>
          <h2>Revisión Jefe Técnico</h2>
          {idRevision && <p className="estado">Revisión ya guardada</p>}
        </div>

        <button
          onClick={guardar}
          disabled={guardando}
          className={guardadoOk ? "guardado" : ""}
        >
          {textoBoton}
        </button>
      </div>

      <div className="fila">
        <button
          type="button"
          className={estado === "Aprobado" ? "opcion verde" : "opcion"}
          onClick={() => setEstado("Aprobado")}
        >
          Aprobar
        </button>

        <button
          type="button"
          className={estado === "Rechazado" ? "opcion rojo" : "opcion"}
          onClick={() => setEstado("Rechazado")}
        >
          Rechazar
        </button>
      </div>

      <div className="campo">
        <label>Motivo</label>
        <textarea
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
      </div>

      <div className="campo">
        <label>Horas hombre estimadas</label>
        <input
          type="number"
          value={horas}
          onChange={(e) => setHoras(e.target.value)}
        />
      </div>

      <div className="campo">
        <label>Procedimiento aprobado</label>
        <textarea
          rows={4}
          value={procedimiento}
          onChange={(e) => setProcedimiento(e.target.value)}
        />
      </div>

      <div className="campo">
        <label>Repuestos aprobados</label>
        <textarea
          rows={4}
          value={repuestos}
          onChange={(e) => setRepuestos(e.target.value)}
        />
      </div>

      <style jsx>{`
        .card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 20px;
          margin-bottom: 18px;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 18px;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }

        .estado {
          margin: 6px 0 0;
          font-size: 13px;
          color: #16a34a;
          font-weight: 800;
        }

        .fila {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }

        button {
          border: none;
          padding: 10px 18px;
          border-radius: 10px;
          background: #2563eb;
          color: white;
          cursor: pointer;
          font-weight: 800;
        }

        button.guardado {
          background: #16a34a;
        }

        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .opcion {
          background: #e2e8f0;
          color: #0f172a;
        }

        .verde {
          background: #16a34a;
          color: white;
        }

        .rojo {
          background: #dc2626;
          color: white;
        }

        .campo {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        label {
          font-weight: 800;
          color: #334155;
        }

        textarea,
        input {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
        }
      `}</style>
    </section>
  );
}