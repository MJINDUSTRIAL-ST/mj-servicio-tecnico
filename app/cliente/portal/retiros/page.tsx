"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Retiro = {
  id: string;
  tipo?: string | null;
  referencia_id?: string | null;
  cliente_email?: string | null;
  fecha_retiro?: string | null;
  hora_retiro?: string | null;
  observaciones?: string | null;
  estado?: string | null;
  created_at?: string | null;
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function colorEstado(estado?: string | null) {
  if (estado === "Agendado") return "bg-blue-50 text-blue-800";
  if (estado === "Retirado") return "bg-green-50 text-green-800";
  if (estado === "Cancelado") return "bg-red-50 text-red-800";

  return "bg-slate-100 text-slate-700";
}

export default function RetirosClientePage() {
  const router = useRouter();

  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarRetiros();
  }, []);

  async function cargarRetiros() {
    const clienteEmail = localStorage.getItem("cliente_email");

    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    const { data, error } = await supabase
      .from("retiros")
      .select("*")
      .eq("cliente_email", clienteEmail.trim().toLowerCase())
      .order("fecha_retiro", { ascending: true })
      .order("hora_retiro", { ascending: true });

    if (error) {
      console.error(error);
      setRetiros([]);
      setLoading(false);
      return;
    }

    setRetiros((data || []) as Retiro[]);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">Retiros agendados</h1>
        <p className="mt-6 text-slate-500">Cargando retiros...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-bold">Retiros agendados</h1>

      <p className="mt-2 text-slate-500">
        Revisa aquí los retiros programados para tus compras y equipos.
      </p>

      {retiros.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No tienes retiros agendados.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {retiros.map((retiro) => (
            <div
              key={retiro.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    Retiro {retiro.tipo === "venta" ? "de compra" : "de servicio técnico"}
                  </h2>

                  <p className="mt-3 text-sm text-slate-500">
                    Fecha: {formatFecha(retiro.fecha_retiro)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Hora: {retiro.hora_retiro || "-"}
                  </p>

                  {retiro.observaciones ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Observaciones: {retiro.observaciones}
                    </p>
                  ) : null}
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${colorEstado(
                    retiro.estado
                  )}`}
                >
                  {retiro.estado || "Agendado"}
                </span>
              </div>

              {retiro.referencia_id ? (
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      retiro.tipo === "venta"
                        ? `/cliente/portal/mis-compras/${retiro.referencia_id}`
                        : `/cliente/portal/servicio-tecnico/${retiro.referencia_id}`
                    )
                  }
                  className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Ver detalle
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}