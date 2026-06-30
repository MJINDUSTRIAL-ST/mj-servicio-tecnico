"use client";

import ChecklistInteligente from "./ChecklistInteligente";

type Props = {
  equipos: any[];
};

export default function ChecklistLote({ equipos }: Props) {
  return (
    <div className="space-y-6">
      {equipos.map((equipo, index) => (
        <div
          key={equipo.id ?? index}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <h2 className="mb-2 text-xl font-bold">
            Equipo {index + 1}
          </h2>

          <p className="text-sm text-slate-500">
            {equipo.equipo || "Sin tipo"}
            {equipo.marca ? ` · ${equipo.marca}` : ""}
            {equipo.modelo ? ` ${equipo.modelo}` : ""}
          </p>

          <ChecklistInteligente
  equipoId={equipo.id}
  tipoEquipoInicial={equipo.equipo}
/>
        </div>
      ))}
    </div>
  );
}