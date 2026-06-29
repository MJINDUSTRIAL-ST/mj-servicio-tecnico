"use client";

import { useState } from "react";

type Props = {
  ordenId: string;
};

export default function DiagnosticoTecnico({ ordenId }: Props) {
  const [diagnostico, setDiagnostico] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [repuestos, setRepuestos] = useState("");

  function guardar() {
    alert("En la siguiente etapa guardaremos esto en Supabase.");
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Diagnóstico Técnico</h2>

        <button onClick={guardar}>
          Guardar diagnóstico
        </button>
      </div>

      <div className="campo">
        <label>Hallazgos del diagnóstico</label>

        <textarea
          value={diagnostico}
          onChange={(e)=>setDiagnostico(e.target.value)}
          rows={5}
        />
      </div>

      <div className="campo">
        <label>Procedimiento recomendado</label>

        <textarea
          value={procedimiento}
          onChange={(e)=>setProcedimiento(e.target.value)}
          rows={4}
        />
      </div>

      <div className="campo">
        <label>Repuestos solicitados</label>

        <textarea
          value={repuestos}
          onChange={(e)=>setRepuestos(e.target.value)}
          rows={4}
        />
      </div>

      <style jsx>{`
        .card{
          background:white;
          border:1px solid #e2e8f0;
          border-radius:18px;
          padding:20px;
          margin-bottom:18px;
        }

        .header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:20px;
        }

        h2{
          margin:0;
          font-size:18px;
          color:#0f172a;
        }

        button{
          background:#2563eb;
          color:white;
          border:none;
          border-radius:10px;
          padding:10px 16px;
          cursor:pointer;
          font-weight:700;
        }

        .campo{
          display:flex;
          flex-direction:column;
          gap:8px;
          margin-bottom:18px;
        }

        label{
          font-weight:700;
          color:#334155;
        }

        textarea{
          resize:vertical;
          border:1px solid #cbd5e1;
          border-radius:10px;
          padding:12px;
          font-size:14px;
        }
      `}</style>
    </section>
  );
}