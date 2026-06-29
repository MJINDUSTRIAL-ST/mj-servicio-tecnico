"use client";

import { useState } from "react";

type Props = {
  ordenId: string;
};

const ITEMS = [
  "Equipo limpio",
  "Accesorios completos",
  "Cable de alimentación",
  "Gancho",
  "Cadena",
  "Control remoto",
  "Manual recibido",
  "Embalaje",
  "Equipo energiza",
  "Fotografías tomadas",
];

export default function ChecklistIngreso({ ordenId }: Props) {
  const [checks, setChecks] = useState<boolean[]>(
    ITEMS.map(() => false)
  );

  function toggle(index: number) {
    const copia = [...checks];
    copia[index] = !copia[index];
    setChecks(copia);
  }

  return (
    <section className="card">
      <div className="header">
        <h2>Checklist de ingreso</h2>
      </div>

      <div className="grid">
        {ITEMS.map((item, i) => (
          <label key={i} className="item">
            <input
              type="checkbox"
              checked={checks[i]}
              onChange={() => toggle(i)}
            />
            {item}
          </label>
        ))}
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
          margin-bottom:18px;
        }

        h2{
          margin:0;
          font-size:18px;
          color:#0f172a;
        }

        .grid{
          display:grid;
          grid-template-columns:repeat(2,1fr);
          gap:12px;
        }

        .item{
          display:flex;
          align-items:center;
          gap:10px;
          font-size:14px;
          color:#334155;
        }

        input{
          width:18px;
          height:18px;
        }

        @media(max-width:700px){
          .grid{
            grid-template-columns:1fr;
          }
        }
      `}</style>
    </section>
  );
}