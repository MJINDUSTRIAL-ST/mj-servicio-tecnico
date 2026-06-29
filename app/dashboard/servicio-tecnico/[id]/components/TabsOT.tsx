"use client";

type Tab =
  | "detalle"
  | "diagnostico"
  | "revision"
  | "cotizacion"
  | "reportes";

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
};

const tabs = [
  { id: "detalle", nombre: "Detalle" },
  { id: "diagnostico", nombre: "Diagnóstico" },
  { id: "revision", nombre: "Revisión" },
  { id: "cotizacion", nombre: "Cotización Interna" },
  { id: "reportes", nombre: "Reportes" },
];

export default function TabsOT({ tab, onChange }: Props) {
  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id as Tab)}
            className={tab === t.id ? "activo" : ""}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      <style jsx>{`
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 22px;
          overflow-x: auto;
        }

        button {
          border: none;
          background: #e2e8f0;
          padding: 12px 18px;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 700;
          white-space: nowrap;
          transition: .2s;
        }

        button:hover{
          background:#cbd5e1;
        }

        .activo{
          background:#2563eb;
          color:white;
        }
      `}</style>
    </>
  );
}