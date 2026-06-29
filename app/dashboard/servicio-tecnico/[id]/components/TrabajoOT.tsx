"use client";

import { useState } from "react";

export default function TrabajoOT() {
  const [trabajo, setTrabajo] = useState("");
  const [repuestos, setRepuestos] = useState("");
  const [observaciones, setObservaciones] = useState("");

  function guardar() {
    alert("Trabajo guardado temporalmente. Luego lo conectamos a Supabase.");
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Trabajo realizado</h2>
        <button type="button" onClick={guardar}>
          Guardar trabajo
        </button>
      </div>

      <div className="campo">
        <label>Trabajo realizado</label>
        <textarea
          rows={5}
          value={trabajo}
          onChange={(e) => setTrabajo(e.target.value)}
        />
      </div>

      <div className="campo">
        <label>Repuestos utilizados</label>
        <textarea
          rows={4}
          value={repuestos}
          onChange={(e) => setRepuestos(e.target.value)}
        />
      </div>

      <div className="campo">
        <label>Observaciones del técnico</label>
        <textarea
          rows={4}
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
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
          gap: 12px;
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
          font-weight: 800;
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
          font-size: 14px;
        }

        textarea {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px;
          font-size: 14px;
          resize: vertical;
        }
      `}</style>
    </section>
  );
}