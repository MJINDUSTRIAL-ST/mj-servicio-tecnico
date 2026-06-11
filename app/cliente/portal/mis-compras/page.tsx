"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  fecha_venta?: string | null;
  created_at?: string | null;
  factura_url?: string | null;
  orden_compra_url?: string | null;
  ficha_tecnica_url?: string | null;
  manual_url?: string | null;
  certificado_url?: string | null;
  fecha_certificado?: string | null;
  vencimiento_certificado?: string | null;
};

const ESTADOS = [
  "Cotizada",
  "Aprobada",
  "Lista para despacho",
  "Despachado",
  "Entregado",
];

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

export default function DetalleCompraPage() {
  const router = useRouter();
  const params = useParams();

  const ventaId = Array.isArray(params.venta)
    ? params.venta[0]
    : params.venta;

  const [compra, setCompra] = useState<Compra | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCompra();
  }, []);

  async function cargarCompra() {
    const clienteEmail = localStorage.getItem("cliente_email");

    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .eq("id", ventaId)
      .eq("cliente_email", clienteEmail.trim().toLowerCase())
      .limit(1);

    if (error) {
      console.error(error);
      setCompra(null);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setCompra(null);
      setLoading(false);
      return;
    }

    setCompra(data[0] as Compra);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="text-slate-500">Cargando compra...</p>
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">Compra no encontrada</h1>
      </div>
    );
  }

  const estadoActual = normalizarEstado(compra.estado);
  const pasoActual = Math.max(ESTADOS.indexOf(estadoActual), 0);

  const documentos = [
    { label: "Factura", url: compra.factura_url },
    { label: "Orden de Compra", url: compra.orden_compra_url },
    { label: "Ficha Técnica", url: compra.ficha_tecnica_url },
    { label: "Manual", url: compra.manual_url },
    { label: "Certificado", url: compra.certificado_url },
  ].filter((doc) => doc.url);

  return (
    <div className="mx-auto max-w-5xl">
      <button
        type="button"
        onClick={() => router.push("/cliente/portal/mis-compras")}
        className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        ← Volver atrás
      </button>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {compra.numero || "Compra"}
            </h1>

            <p className="mt-3 text-2xl font-semibold">
              {compra.producto || "Producto sin nombre"}
            </p>

            <p className="mt-2 text-slate-500">
              {compra.descripcion || compra.detalle || "Sin descripción"}
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Fecha venta: {formatFecha(compra.fecha_venta || compra.created_at)}
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${colorEstado(
              estadoActual
            )}`}
          >
            {estadoActual}
          </span>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="mb-5 text-lg font-bold">Avance de compra</h2>

          <div className="relative py-3">
            <div className="absolute left-0 right-0 top-5 h-1 rounded-full bg-slate-200" />

            <div
              className="absolute left-0 top-5 h-1 rounded-full bg-orange-500"
              style={{
                width: `${((pasoActual + 1) / ESTADOS.length) * 100}%`,
              }}
            />

            <div
              className="relative grid"
              style={{
                gridTemplateColumns: `repeat(${ESTADOS.length}, 1fr)`,
              }}
            >
              {ESTADOS.map((estado, index) => {
                const activo = index <= pasoActual;

                return (
                  <div
                    key={estado}
                    className="flex flex-col items-center text-center"
                  >
                    <div
                      className={`h-5 w-5 rounded-full border-4 border-white shadow ${
                        activo ? "bg-orange-500" : "bg-slate-300"
                      }`}
                    />

                    <span
                      className={`mt-3 text-xs ${
                        activo
                          ? "font-bold text-slate-900"
                          : "font-medium text-slate-400"
                      }`}
                    >
                      {estado}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {documentos.length === 0 ? (
            <p className="text-sm text-slate-500">No hay documentos adjuntos.</p>
          ) : (
            documentos.map((doc) => (
              <DocumentoButton
                key={doc.label}
                href={doc.url || "#"}
                label={doc.label}
              />
            ))
          )}
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-semibold text-blue-600">Certificado</p>

          <div className="mt-2 text-sm text-slate-600">
            <p>Fecha test: {formatFecha(compra.fecha_certificado)}</p>
            <p className="mt-1">
              Vencimiento: {formatFecha(compra.vencimiento_certificado)}
            </p>
          </div>

          {compra.certificado_url ? (
            <a
              href={compra.certificado_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ver certificado PDF
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DocumentoButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200"
    >
      {label}
    </a>
  );
}