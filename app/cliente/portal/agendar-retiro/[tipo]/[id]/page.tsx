"use client";

import { useParams } from "next/navigation";

export default function AgendarRetiroPage() {
  const params = useParams();

  const tipo = params.tipo as string;
  const id = params.id as string;

  const horarios = [
    "11:00",
    "12:00",
    "15:00",
    "16:00",
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-bold">
        Agendar Retiro
      </h1>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-slate-500">
          Tipo:
        </p>

        <p className="font-semibold">
          {tipo}
        </p>

        <p className="mt-4 text-slate-500">
          ID:
        </p>

        <p className="font-semibold">
          {id}
        </p>

        <div className="mt-8">
          <label className="block text-sm font-semibold">
            Fecha de retiro
          </label>

          <input
            type="date"
            className="mt-2 w-full rounded-xl border border-slate-300 p-3"
          />
        </div>

        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold">
            Horario disponible
          </p>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {horarios.map((hora) => (
              <button
                key={hora}
                className="rounded-xl border border-slate-300 p-3 hover:bg-slate-100"
              >
                {hora}
              </button>
            ))}
          </div>
        </div>

        <button
          className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
        >
          Confirmar retiro
        </button>
      </div>
    </div>
  );
}