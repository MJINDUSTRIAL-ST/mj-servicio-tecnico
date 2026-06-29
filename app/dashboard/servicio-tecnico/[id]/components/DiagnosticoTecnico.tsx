"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";

type Props = {
  ordenId: string;
};

export default function DiagnosticoTecnico({ ordenId }: Props) {
  const [idDiagnostico, setIdDiagnostico] = useState<string | null>(null);

  const [diagnostico, setDiagnostico] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [repuestos, setRepuestos] = useState("");

  const [guardando, setGuardando] = useState(false);

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

    try {
      if (idDiagnostico) {
        const { error } = await supabase
          .from("diagnosticos")
          .update({
            hallazgos: diagnostico,
            procedimiento,
            repuestos,
            updated_at: new Date(),
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

      await supabase
        .from("ordenes")
        .update({
          estado: "Revisión",
        })
        .eq("id", ordenId);

      alert("Diagnóstico guardado correctamente.");
    } catch (e: any) {
      alert(e.message);
    }

    setGuardando(false);
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Diagnóstico Técnico</h2>

        <button onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar diagnóstico"}
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
          margin-bottom: 20px;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          color: #0f172a;
        }

        button {
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 16px;
          cursor: pointer;
          font-weight: 700;
        }

        button:disabled {
          opacity: .6;
          cursor: not-allowed;
        }

        .campo {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 18px;
        }

        label {
          font-weight: 700;
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