"use client";

type Props = {
  totalItems: number;
  itemsRespondidos: number;
  itemsMalos: number;
};

export default function BarraProgreso({
  totalItems,
  itemsRespondidos,
  itemsMalos,
}: Props) {
  const porcentaje =
    totalItems > 0 ? Math.round((itemsRespondidos / totalItems) * 100) : 0;

  return (
    <div className="mb-5 rounded-xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-900">Avance del checklist</p>

        <span className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
          {porcentaje}%
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs font-semibold">
        <div className="rounded-lg bg-white p-3 text-slate-600">
          Total
          <div className="mt-1 text-lg text-slate-900">{totalItems}</div>
        </div>

        <div className="rounded-lg bg-white p-3 text-slate-600">
          Respondidos
          <div className="mt-1 text-lg text-slate-900">{itemsRespondidos}</div>
        </div>

        <div className="rounded-lg bg-white p-3 text-slate-600">
          Malos
          <div className="mt-1 text-lg text-red-600">{itemsMalos}</div>
        </div>
      </div>
    </div>
  );
}