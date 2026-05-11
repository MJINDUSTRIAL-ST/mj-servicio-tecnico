"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Orden = {
  id: string;
  codigo: string;
  cliente: string;
  equipo: string;
  estado: string;
  prioridad: string | null;
  created_at: string | null;
  cliente_email: string | null;
};

export default function ClienteServicioTecnicoPage() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarOrdenes = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const email = session?.user?.email;

      if (!email) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("ordenes")
        .select("*")
        .ilike("cliente_email", email.trim().toLowerCase())
        .order("created_at", { ascending: false });

      if (!error) {
        setOrdenes(data || []);
      }

      setLoading(false);
    };

    cargarOrdenes();
  }, []);

  const listoEntrega = ordenes.filter(
    (o) => o.estado === "Listo" || o.estado === "Listo p/Entrega"
  ).length;

  const cotizacion = ordenes.filter((o) => o.estado === "Cotización").length;

  return (
    <main className="p-6">
      <button
        onClick={() => window.history.back()}
        className="mb-6 rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
      >
        ← Volver atrás
      </button>

      <h1 className="mb-6 text-4xl font-bold">Servicio Técnico</h1>

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-500">Listo p/Entrega</p>
          <p className="text-3xl font-bold text-blue-600">{listoEntrega}</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-slate-500">Cotización</p>
          <p className="text-3xl font-bold text-blue-600">{cotizacion}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando órdenes...</p>
      ) : ordenes.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-500 shadow-sm">
          No tienes órdenes registradas.
        </div>
      ) : (
        <div className="space-y-4">
          {ordenes.map((orden) => (
            <Link
              key={orden.id}
              href={`/cliente/portal/servicio-tecnico/${orden.id}`}
              className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{orden.codigo}</h2>
                  <p className="mt-1 text-slate-600">{orden.equipo}</p>
                </div>

                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                  {orden.estado}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}