"use client";

type Tab =
  | "detalle"
  | "diagnostico"
  | "revision"
  | "cotizacion"
  | "trabajo"
  | "reportes";

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
};

const tabs: { id: Tab; nombre: string }[] = [
  { id: "detalle", nombre: "Detalle" },
  { id: "diagnostico", nombre: "Diagnóstico" },
  { id: "revision", nombre: "Revisión" },
  { id: "cotizacion", nombre: "Cotización Interna" },
  { id: "trabajo", nombre: "Trabajo" },
  { id: "reportes", nombre: "Reportes" },
];

export default function TabsOT({ tab, onChange }: Props) {
  return (
    <>
      <div className="tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
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
        }

        .activo {
          background: #2563eb;
          color: white;
        }
      `}</style>
    </>
  );
}