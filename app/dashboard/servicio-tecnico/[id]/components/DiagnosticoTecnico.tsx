"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Props = {
  ordenId: string;
  onEstadoActualizado?: (estado: string) => void;
};

export default function DiagnosticoTecnico({
  ordenId,
  onEstadoActualizado,
}: Props) {
  const [idDiagnostico, setIdDiagnostico] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [repuestos, setRepuestos] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    cargarDiagnostico();
  }, [ordenId]);

  async function cargarDiagnostico() {
    const { data } = await supabase
      .from("diagnosticos")
      .select("*")
      .eq("orden_id", ordenId)
      .maybeSingle();

    if (!data) return;

    setIdDiagnostico(data.id);
    setDiagnostico(data.hallazgos || "");
    setProcedimiento(data.procedimiento || "");
    setRepuestos(data.repuestos || "");
  }

  async function guardar() {
    setGuardando(true);
    setGuardadoOk(false);

    try {
      if (idDiagnostico) {
        const { error } = await supabase
          .from("diagnosticos")
          .update({
            hallazgos: diagnostico,
            procedimiento,
            repuestos,
            updated_at: new Date().toISOString(),
          })
          .eq("id", idDiagnostico);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("diagnosticos")
          .insert({
            orden_id: ordenId,
            hallazgos: diagnostico,
            procedimiento,
            repuestos,
          })
          .select()
          .single();

        if (error) throw error;
        setIdDiagnostico(data.id);
      }

      const { error: errorOrden } = await supabase
        .from("ordenes")
        .update({ estado: "Diagnóstico" })
        .eq("id", ordenId);

      if (errorOrden) throw errorOrden;

      onEstadoActualizado?.("Diagnóstico");

      setGuardadoOk(true);

      setTimeout(() => {
        setGuardadoOk(false);
      }, 2500);
    } catch (e: any) {
      alert(e.message || "No se pudo guardar el diagnóstico");
    } finally {
      setGuardando(false);
    }
  }

  const textoBoton = guardando
    ? "Guardando..."
    : guardadoOk
    ? "✓ Diagnóstico guardado"
    : idDiagnostico
    ? "Modificar diagnóstico"
    : "Guardar diagnóstico";

  return (
    <section className="card">
      <div className="header">
        <div>
          <h2>Diagnóstico Técnico</h2>
          {idDiagnostico && <p className="estado">Diagnóstico ya guardado</p>}
        </div>

        <button
  onClick={guardar}
  disabled={guardando}
>
  {guardando
    ? "Guardando..."
    : idDiagnostico
      ? "Modificar diagnóstico"
      : "Guardar diagnóstico"}
</button>
      </div>

      <div className="campo">
        <label>Hallazgos del diagnóstico</label>
        <textarea
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          rows={5}
        />
      </div>

      <div className="campo">
        <label>Procedimiento recomendado</label>
        <textarea
          value={procedimiento}
          onChange={(e) => setProcedimiento(e.target.value)}
          rows={4}
        />
      </div>

      <div className="campo">
        <label>Repuestos solicitados</label>
        <textarea
          value={repuestos}
          onChange={(e) => setRepuestos(e.target.value)}
          rows={4}
        />
      </div>

      <style jsx>{`
        .card {
          background: white;
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
          margin-bottom: 20px;
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

        button {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 800;
          min-width: 190px;
        }

        button.guardado {
          background: #16a34a;
        }

        button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
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

        textarea {
          resize: vertical;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
        }
      `}</style>
    </section>
  );
}