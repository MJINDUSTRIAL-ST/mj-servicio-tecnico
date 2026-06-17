"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Compra = {
  id: string;
  numero?: string | null;
  producto?: string | null;
  descripcion?: string | null;
  detalle?: string | null;
  estado?: string | null;
  fecha_venta?: string | null;
  created_at?: string | null;
  cliente_email?: string | null;
};

type Retiro = {
  referencia_id?: string | null;
  estado?: string | null;
  tipo?: string | null;
};

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Cotizada";
  if (estado === "Pendiente") return "Cotizada";
  if (estado === "Completada") return "Entregado";
  return estado;
}

function obtenerEstadoVisible(
  compra: Compra,
  retiros: Retiro[]
) {
  const retiro = retiros.find(
    (r) => r.referencia_id === compra.id
  );

  if (
    retiro &&
    retiro.estado === "Agendado"
  ) {
    return retiro.tipo === "venta"
      ? "Retiro agendado"
      : "Despacho solicitado";
  }

  return normalizarEstado(compra.estado);
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-CL");
}

export default function MisComprasPage() {
  const router = useRouter();
  const [compras, setCompras] = useState<Compra[]>([]);
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCompras();
  }, []);

  async function cargarCompras() {
    const clienteEmail = localStorage.getItem("cliente_email");

    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .eq("cliente_email", clienteEmail.trim().toLowerCase())
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setCompras([]);
      setLoading(false);
      return;
    }

    setCompras((data || []) as Compra[]);
    const ventaIds = (data || []).map((v) => v.id);

if (ventaIds.length > 0) {
  const { data: retirosData } = await supabase
    .from("retiros")
    .select("*")
    .in("referencia_id", ventaIds);

  setRetiros((retirosData || []) as Retiro[]);
}
    setLoading(false);
  }

  const resumen = useMemo(() => {
    return {
      total: compras.length,
      cotizadas: compras.filter((c) => normalizarEstado(c.estado) === "Cotizada").length,
      aprobadas: compras.filter((c) => normalizarEstado(c.estado) === "Aprobada").length,
      listas: compras.filter(
  (c) =>
    obtenerEstadoVisible(c, retiros) ===
    "Lista para despacho"
).length,
      despachadas: compras.filter((c) => normalizarEstado(c.estado) === "Despachado").length,
      entregadas: compras.filter((c) => normalizarEstado(c.estado) === "Entregado").length,
    };
  }, [compras]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">Mis Compras</h1>
        <p className="mt-6 text-slate-500">Cargando compras...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-bold">Mis Compras</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <ResumenCard titulo="Total" valor={resumen.total} clase="bg-slate-50" />
        <ResumenCard titulo="Cotizadas" valor={resumen.cotizadas} clase="bg-yellow-50" />
        <ResumenCard titulo="Aprobadas" valor={resumen.aprobadas} clase="bg-blue-50" />
        <ResumenCard titulo="Listas" valor={resumen.listas} clase="bg-green-50" />
        <ResumenCard titulo="Despachadas" valor={resumen.despachadas} clase="bg-indigo-50" />
        <ResumenCard titulo="Entregadas" valor={resumen.entregadas} clase="bg-emerald-50" />
      </div>

      {compras.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No tienes compras registradas.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {compras.map((compra) => (
            <Link
              key={compra.id}
              href={`/cliente/portal/mis-compras/${compra.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {compra.numero || "Venta"}
                  </h2>

                  <p className="mt-2 font-semibold">
                    {compra.producto || "Producto sin nombre"}
                  </p>

                  <p className="mt-1 text-slate-500">
                    {compra.descripcion || compra.detalle || "Sin descripción"}
                  </p>

                  <p className="mt-3 text-sm text-slate-400">
                    Fecha venta: {formatFecha(compra.fecha_venta || compra.created_at)}
                  </p>
                </div>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                 {obtenerEstadoVisible(compra, retiros)}
                </span>
              </div>

              <p className="mt-4 text-sm font-semibold text-blue-600">
                Ver detalle →
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ResumenCard({
  titulo,
  valor,
  clase,
}: {
  titulo: string;
  valor: number;
  clase: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${clase}`}>
      <p className="text-sm font-semibold text-slate-600">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{valor}</p>
    </div>
  );
}