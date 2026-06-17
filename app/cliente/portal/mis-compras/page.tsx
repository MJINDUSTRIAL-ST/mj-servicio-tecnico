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

type FiltroEstado =
  | "Todos"
  | "Cotizada"
  | "Aprobada"
  | "Lista para despacho"
  | "Retiro agendado"
  | "Despachado"
  | "Entregado";

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Cotizada";
  if (estado === "Pendiente") return "Cotizada";
  if (estado === "Completada") return "Entregado";
  return estado;
}

function obtenerEstadoVisible(compra: Compra, retiros: Retiro[]) {
  const retiro = retiros.find((r) => r.referencia_id === compra.id);

  if (retiro && retiro.estado === "Agendado") {
    return "Retiro agendado";
  }

  if (retiro && retiro.estado === "Retirado") {
    return "Entregado";
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
  const [filtro, setFiltro] = useState<FiltroEstado>("Todos");

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

    const comprasData = (data || []) as Compra[];
    setCompras(comprasData);

    const ventaIds = comprasData.map((v) => v.id);

    if (ventaIds.length > 0) {
      const { data: retirosData } = await supabase
        .from("retiros")
        .select("*")
        .in("referencia_id", ventaIds);

      setRetiros((retirosData || []) as Retiro[]);
    }

    setLoading(false);
  }

  const comprasConEstado = useMemo(() => {
    return compras.map((compra) => ({
      ...compra,
      estadoVisible: obtenerEstadoVisible(compra, retiros),
    }));
  }, [compras, retiros]);

  const resumen = useMemo(() => {
    return {
      total: comprasConEstado.length,
      cotizadas: comprasConEstado.filter((c) => c.estadoVisible === "Cotizada").length,
      aprobadas: comprasConEstado.filter((c) => c.estadoVisible === "Aprobada").length,
      listas: comprasConEstado.filter((c) => c.estadoVisible === "Lista para despacho").length,
      retirosAgendados: comprasConEstado.filter((c) => c.estadoVisible === "Retiro agendado").length,
      despachadas: comprasConEstado.filter((c) => c.estadoVisible === "Despachado").length,
      entregadas: comprasConEstado.filter((c) => c.estadoVisible === "Entregado").length,
    };
  }, [comprasConEstado]);

  const comprasFiltradas = useMemo(() => {
    if (filtro === "Todos") return comprasConEstado;
    return comprasConEstado.filter((c) => c.estadoVisible === filtro);
  }, [comprasConEstado, filtro]);

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

      <div className="mt-6 grid gap-4 md:grid-cols-3 lg:grid-cols-7">
        <ResumenCard titulo="Total" valor={resumen.total} clase="bg-slate-50" activo={filtro === "Todos"} onClick={() => setFiltro("Todos")} />
        <ResumenCard titulo="Cotizadas" valor={resumen.cotizadas} clase="bg-yellow-50" activo={filtro === "Cotizada"} onClick={() => setFiltro("Cotizada")} />
        <ResumenCard titulo="Aprobadas" valor={resumen.aprobadas} clase="bg-blue-50" activo={filtro === "Aprobada"} onClick={() => setFiltro("Aprobada")} />
        <ResumenCard titulo="Listas" valor={resumen.listas} clase="bg-green-50" activo={filtro === "Lista para despacho"} onClick={() => setFiltro("Lista para despacho")} />
        <ResumenCard titulo="Retiros" valor={resumen.retirosAgendados} clase="bg-orange-50" activo={filtro === "Retiro agendado"} onClick={() => setFiltro("Retiro agendado")} />
        <ResumenCard titulo="Despachadas" valor={resumen.despachadas} clase="bg-indigo-50" activo={filtro === "Despachado"} onClick={() => setFiltro("Despachado")} />
        <ResumenCard titulo="Entregadas" valor={resumen.entregadas} clase="bg-emerald-50" activo={filtro === "Entregado"} onClick={() => setFiltro("Entregado")} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-500">
          Mostrando: {filtro === "Todos" ? "Todas las compras" : filtro}
        </p>

        {filtro !== "Todos" ? (
          <button
            type="button"
            onClick={() => setFiltro("Todos")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Limpiar filtro
          </button>
        ) : null}
      </div>

      {comprasFiltradas.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No hay compras en este estado.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {comprasFiltradas.map((compra) => (
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
                  {compra.estadoVisible}
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
  activo,
  onClick,
}: {
  titulo: string;
  valor: number;
  clase: string;
  activo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl p-5 text-left transition hover:scale-[1.02] ${clase} ${
        activo ? "ring-2 ring-blue-600" : ""
      }`}
    >
      <p className="text-sm font-semibold text-slate-600">{titulo}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{valor}</p>
    </button>
  );
}