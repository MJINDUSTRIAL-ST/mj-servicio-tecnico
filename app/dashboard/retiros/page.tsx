"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Retiro = {
  id: string;
  fecha_retiro: string;
  hora_retiro: string;
  estado: string;
  observaciones: string;
  tipo: string;
  referencia_id: string;
  cliente_nombre: string;
};

export default function RetirosDashboardPage() {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarRetiros();
  }, []);

  async function cargarRetiros() {
    const { data, error } = await supabase
      .from("retiros")
      .select("*")
      .order("fecha_retiro", { ascending: true });

    if (!error) {
      setRetiros(data || []);
    }

    setLoading(false);
  }

  const agendados = retiros.filter(
    (r) => r.estado === "Agendado"
  ).length;

  return (

    <div className="p-8">
        <button
  onClick={() => window.history.back()}
  style={{
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 18,
  }}
>
  ← Volver atrás
</button>
      <h1 className="text-3xl font-bold mb-2">
        Retiros Agendados
      </h1>

      <p className="text-slate-500 mb-6">
        Ventas y Servicio Técnico
      </p>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="rounded-xl border p-5 bg-white">
          <p className="text-slate-500 text-sm">
            Total retiros
          </p>
          <p className="text-3xl font-bold">
            {retiros.length}
          </p>
        </div>

        <div className="rounded-xl border p-5 bg-white">
          <p className="text-slate-500 text-sm">
            Pendientes
          </p>
          <p className="text-3xl font-bold">
            {agendados}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        {loading ? (
          <div className="p-6">Cargando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="p-4 text-left">Fecha</th>
                <th className="p-4 text-left">Hora</th>
                <th className="p-4 text-left">Cliente</th>
                <th className="p-4 text-left">Tipo</th>
                <th className="p-4 text-left">Estado</th>
                <th className="p-4 text-left">Detalle</th>
              </tr>
            </thead>

            <tbody>
              {retiros.map((retiro) => (
                <tr
                  key={retiro.id}
                  className="border-b"
                >
                  <td className="p-4">
                    {retiro.fecha_retiro}
                  </td>

                  <td className="p-4">
                    {retiro.hora_retiro}
                  </td>

                  <td className="p-4">
                    {retiro.cliente_nombre}
                  </td>

                  <td className="p-4">
                    {retiro.tipo}
                  </td>

                  <td className="p-4">
                    {retiro.estado}
                  </td>

                  <td className="p-4">
                    {retiro.tipo === "venta" ? (
                      <Link
                        href={`/dashboard/ventas/${retiro.referencia_id}`}
                        className="text-blue-600"
                      >
                        Ver venta
                      </Link>
                    ) : (
                      <Link
                        href={`/dashboard/servicio-tecnico/${retiro.referencia_id}`}
                        className="text-blue-600"
                      >
                        Ver orden
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}