"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Compra = {
  id: string;
  numero?: string | null;
  cliente?: string | null;
  cliente_email?: string | null;
  producto?: string | null;
  descripcion?: string | null;
  detalle?: string | null;
  estado?: string | null;
  factura_url?: string | null;
  orden_compra_url?: string | null;
  ficha_tecnica_url?: string | null;
  manual_url?: string | null;
  certificado_url?: string | null;
  fecha_venta?: string | null;
  created_at?: string | null;
  fecha_certificacion?: string | null;
  vencimiento_certificado?: string | null;
};

function normalizarEstado(estado?: string | null) {
  if (!estado) return "Cotizada";
  if (estado === "Pendiente") return "Cotizada";
  if (estado === "Completada") return "Entregado";
  return estado;
}

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";

  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return fecha;
  }
}

function colorEstado(estado?: string | null) {
  const actual = normalizarEstado(estado);

  if (actual === "Cotizada") return "bg-yellow-50 text-yellow-800";
  if (actual === "Aprobada") return "bg-blue-50 text-blue-800";
  if (actual === "Lista para despacho") return "bg-green-50 text-green-800";
  if (actual === "Despachado") return "bg-indigo-50 text-indigo-800";
  if (actual === "Entregado") return "bg-emerald-50 text-emerald-800";

  return "bg-slate-100 text-slate-700";
}

export default function MisComprasPage() {
  const router = useRouter();

  const [compras, setCompras] = useState<Compra[]>([]);
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

    setLoading(true);

    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .eq("cliente_email", clienteEmail.trim().toLowerCase())
      .order("fecha_venta", { ascending: false });

    if (error) {
      console.error(error);
      alert("Error cargando compras: " + error.message);
      setCompras([]);
      setLoading(false);
      return;
    }

    setCompras((data || []) as Compra[]);
    setLoading(false);
  }

  const resumen = useMemo(() => {
    return {
      total: compras.length,
      cotizadas: compras.filter((c) => normalizarEstado(c.estado) === "Cotizada")
        .length,
      aprobadas: compras.filter((c) => normalizarEstado(c.estado) === "Aprobada")
        .length,
      listas: compras.filter(
        (c) => normalizarEstado(c.estado) === "Lista para despacho"
      ).length,
      despachadas: compras.filter(
        (c) => normalizarEstado(c.estado) === "Despachado"
      ).length,
      entregadas: compras.filter(
        (c) => normalizarEstado(c.estado) === "Entregado"
      ).length,
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
          {compras.map((compra) => {
            const estadoActual = normalizarEstado(compra.estado);

            const documentos = [
              { label: "Factura", url: compra.factura_url },
              { label: "Orden de Compra", url: compra.orden_compra_url },
              { label: "Ficha Técnica", url: compra.ficha_tecnica_url },
              { label: "Manual", url: compra.manual_url },
              { label: "Certificado", url: compra.certificado_url },
            ].filter((doc) => doc.url);

            return (
              <Link
                key={compra.id}
                href={`/cliente/portal/mis-compras/${compra.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">
                      {compra.numero || "Venta"}
                    </h3>

                    <p className="mt-2 font-semibold">
                      {compra.producto || "Producto sin nombre"}
                    </p>

                    <p className="mt-1 text-slate-500">
                      {compra.descripcion || compra.detalle || "Sin descripción"}
                    </p>

                    <p className="mt-2 text-sm text-slate-400">
                      Fecha venta:{" "}
                      {formatFecha(compra.fecha_venta || compra.created_at)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${colorEstado(
                      estadoActual
                    )}`}
                  >
                    {estadoActual}
                  </span>
                </div>

                {documentos.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {documentos.map((doc) => (
                      <span
                        key={doc.label}
                        className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        📄 {doc.label}
                      </span>
                    ))}
                  </div>
                ) : null}

                {(compra.fecha_certificacion ||
                  compra.vencimiento_certificado) ? (
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="font-semibold text-blue-600">🏅 Certificado</p>

                    <div className="mt-2 text-sm text-slate-600">
                      <p>
                        📅 Fecha test:{" "}
                        {formatFecha(compra.fecha_certificacion)}
                      </p>

                      <p className="mt-1">
                        📅 Vencimiento:{" "}
                        {formatFecha(compra.vencimiento_certificado)}
                      </p>
                    </div>
                  </div>
                ) : null}

                <p className="mt-4 text-sm font-semibold text-blue-600">
                  Ver detalle →
                </p>
              </Link>
            );
          })}
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