"use client";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export default function ServicioTecnicoPage() {
  const ordenes = [
    {
      numero: "OT-202604-0014",
      producto: "tecle palanca liftech HSZK 1500",
      estado: "Listo para Entrega",
      color: "bg-green-100 text-green-700",
    },
    {
      numero: "OT-202604-0013",
      producto: "tanqueta liftech RSA 6ton",
      estado: "Cotización",
      color: "bg-purple-100 text-purple-700",
    },
    {
      numero: "OT-202604-0012",
      producto: "winche 20ton richter RT 20000",
      estado: "Listo para Entrega",
      color: "bg-green-100 text-green-700",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-bold">Servicio Técnico</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Listo p/Entrega</span>
            <span className="text-3xl font-bold text-blue-600">2</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Cotización</span>
            <span className="text-3xl font-bold text-blue-600">1</span>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {ordenes.map((orden) => (
          <Link
            key={orden.numero}
            href={`/cliente/portal/servicio-tecnico/${orden.numero}`}
            className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {orden.numero}
                </h2>
                <p className="mt-2 text-lg text-slate-500">{orden.producto}</p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${orden.color}`}
              >
                {orden.estado}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}