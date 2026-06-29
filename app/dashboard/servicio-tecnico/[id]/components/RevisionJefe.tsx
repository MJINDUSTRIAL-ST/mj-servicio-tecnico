"use client";

import { useState } from "react";

type Props = {
  ordenId: string;
};

export default function RevisionJefe({ ordenId }: Props) {
  const [estado, setEstado] = useState("");
  const [motivo, setMotivo] = useState("");
  const [horas, setHoras] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [repuestos, setRepuestos] = useState("");

  function guardar() {
    alert("En la siguiente etapa esto quedará guardado en Supabase.");
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Revisión Jefe Técnico</h2>

        <button onClick={guardar}>
          Guardar revisión
        </button>
      </div>

      <div className="fila">
        <button
          className={estado === "Aprobado" ? "activo verde" : ""}
          onClick={() => setEstado("Aprobado")}
        >
          Aprobar
        </button>

        <button
          className={estado === "Rechazado" ? "activo rojo" : ""}
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
        .card{
          background:#fff;
          border:1px solid #e2e8f0;
          border-radius:18px;
          padding:20px;
          margin-bottom:18px;
        }

        .header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          margin-bottom:18px;
        }

        h2{
          margin:0;
          font-size:18px;
        }

        .fila{
          display:flex;
          gap:12px;
          margin-bottom:20px;
        }

        button{
          border:none;
          padding:10px 18px;
          border-radius:10px;
          background:#e2e8f0;
          cursor:pointer;
          font-weight:700;
        }

        .verde{
          background:#16a34a;
          color:white;
        }

        .rojo{
          background:#dc2626;
          color:white;
        }

        .campo{
          display:flex;
          flex-direction:column;
          gap:8px;
          margin-bottom:18px;
        }

        textarea,
        input{
          border:1px solid #cbd5e1;
          border-radius:10px;
          padding:10px;
        }
      `}</style>
    </section>
  );
}