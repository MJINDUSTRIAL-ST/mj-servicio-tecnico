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

function tituloRetiro(retiro: Retiro) {
  const tipoTexto =
    retiro.tipo === "venta" ? "compra" : "servicio técnico";

  if (retiro.estado === "Retirado") {
    return `Producto retirado de ${tipoTexto}`;
  }

  return `Retiro de ${tipoTexto}`;
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

  const proximos = retiros.filter((retiro) => retiro.estado !== "Retirado");
  const historial = retiros.filter((retiro) => retiro.estado === "Retirado");

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">Retiros</h1>
        <p className="mt-6 text-slate-500">Cargando retiros...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-bold">Retiros</h1>

      <p className="mt-2 text-slate-500">
        Revisa tus próximos retiros y el historial de productos retirados.
      </p>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">Próximos retiros</h2>

        {proximos.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
            No tienes retiros pendientes.
          </div>
        ) : (
          <div className="mt-5 grid gap-5">
            {proximos.map((retiro) => (
              <RetiroCard key={retiro.id} retiro={retiro} router={router} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold">Historial de retiros</h2>

        {historial.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
            Aún no tienes retiros completados.
          </div>
        ) : (
          <div className="mt-5 grid gap-5">
            {historial.map((retiro) => (
              <RetiroCard key={retiro.id} retiro={retiro} router={router} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RetiroCard({
  retiro,
  router,
}: {
  retiro: Retiro;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold">{tituloRetiro(retiro)}</h3>

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
  );
}