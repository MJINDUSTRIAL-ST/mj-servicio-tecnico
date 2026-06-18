"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Despacho = {
  id: string;
  cliente_email: string | null;
  producto_equipo: string | null;
  estado: string | null;
  fecha_retiro: string | null;
  hora_retiro: string | null;
  created_at: string;
  referencia_id: string | null;
};

export default function DespachosPage() {
  const [despachos, setDespachos] = useState<Despacho[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDespachos();
  }, []);

  async function cargarDespachos() {
    const { data } = await supabase
      .from("retiros")
      .select("*")
      .eq("tipo", "despacho")
      .order("created_at", { ascending: false });

    setDespachos((data || []) as Despacho[]);
    setLoading(false);
  }

  async function programarDespacho(id: string) {
    const fecha = prompt("Fecha despacho (YYYY-MM-DD)");

    if (!fecha) return;

    const hora = prompt("Hora despacho (HH:mm)");

    if (!hora) return;

    const { error } = await supabase
      .from("retiros")
      .update({
        estado: "Programado",
        fecha_retiro: fecha,
        hora_retiro: hora,
      })
      .eq("id", id);

    if (error) {
      alert("Error al programar");
      return;
    }

    alert("Despacho programado");
    cargarDespachos();
  }

  async function marcarDespachado(id: string) {
    await supabase
      .from("retiros")
      .update({
        estado: "Despachado",
      })
      .eq("id", id);

    cargarDespachos();
  }

  async function marcarEntregado(id: string) {
    await supabase
      .from("retiros")
      .update({
        estado: "Entregado",
      })
      .eq("id", id);

    cargarDespachos();
  }

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="mb-6 text-3xl font-bold">
        Despachos Solicitados
      </h1>

      <div className="space-y-4">
        {despachos.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">
                  {item.producto_equipo}
                </p>

                <p className="text-sm text-slate-500">
                  {item.cliente_email}
                </p>

                <p className="mt-2 text-sm">
                  Estado:
                  <strong> {item.estado}</strong>
                </p>

                {item.fecha_retiro && (
                  <p className="text-sm">
                    Fecha: {item.fecha_retiro}
                  </p>
                )}

                {item.hora_retiro && (
                  <p className="text-sm">
                    Hora: {item.hora_retiro}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {item.estado === "Solicitado" && (
                  <button
                    onClick={() =>
                      programarDespacho(item.id)
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-white"
                  >
                    Programar
                  </button>
                )}

                {item.estado === "Programado" && (
                  <button
                    onClick={() =>
                      marcarDespachado(item.id)
                    }
                    className="rounded-lg bg-orange-600 px-4 py-2 text-white"
                  >
                    Despachado
                  </button>
                )}

                {item.estado === "Despachado" && (
                  <button
                    onClick={() =>
                      marcarEntregado(item.id)
                    }
                    className="rounded-lg bg-green-600 px-4 py-2 text-white"
                  >
                    Entregado
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}