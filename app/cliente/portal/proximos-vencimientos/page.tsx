"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Compra = {
  id: string;
  numero?: string | null;
  producto?: string | null;
  cliente_email?: string | null;
  fecha_certificado?: string | null;
  vencimiento_certificado?: string | null;
  certificado_url?: string | null;
};

function formatFecha(fecha?: string | null) {
  if (!fecha) return "-";
  return new Date(fecha).toLocaleDateString("es-CL");
}

function diasRestantes(fecha?: string | null) {
  if (!fecha) return null;

  const hoy = new Date();
  const vencimiento = new Date(fecha);

  hoy.setHours(0, 0, 0, 0);
  vencimiento.setHours(0, 0, 0, 0);

  return Math.ceil(
    (vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)
  );
}

export default function ProximosVencimientosPage() {
  const router = useRouter();

  const [compras, setCompras] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarVencimientos();
  }, []);

  async function cargarVencimientos() {
    const clienteEmail = localStorage.getItem("cliente_email");

    if (!clienteEmail) {
      router.push("/cliente");
      return;
    }

    const { data, error } = await supabase
      .from("ventas")
      .select("*")
      .eq("cliente_email", clienteEmail.trim().toLowerCase())
      .not("vencimiento_certificado", "is", null)
      .order("vencimiento_certificado", { ascending: true });

    if (error) {
      console.error(error);
      setCompras([]);
      setLoading(false);
      return;
    }

    setCompras((data || []) as Compra[]);
    setLoading(false);
  }

  const vencimientos = useMemo(() => {
    return compras
      .map((compra) => ({
        ...compra,
        dias: diasRestantes(compra.vencimiento_certificado),
      }))
      .sort((a, b) => (a.dias ?? 99999) - (b.dias ?? 99999));
  }, [compras]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">Próximos vencimientos</h1>
        <p className="mt-6 text-slate-500">Cargando certificados...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-4xl font-bold">Próximos vencimientos</h1>

      <p className="mt-2 text-slate-500">
        Revisa aquí los certificados de tus equipos y sus fechas de vencimiento.
      </p>

      {vencimientos.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">
          No tienes certificados con vencimiento registrado.
        </div>
      ) : (
        <div className="mt-10 grid gap-5">
          {vencimientos.map((compra) => {
            const vencido = compra.dias !== null && compra.dias < 0;
            const porVencer =
              compra.dias !== null && compra.dias >= 0 && compra.dias <= 30;

            return (
              <div
                key={compra.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {compra.numero || "Compra"}
                    </h2>

                    <p className="mt-2 font-semibold">
                      {compra.producto || "Producto sin nombre"}
                    </p>

                    <p className="mt-3 text-sm text-slate-500">
                      Fecha test: {formatFecha(compra.fecha_certificado)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Vencimiento:{" "}
                      {formatFecha(compra.vencimiento_certificado)}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-semibold ${
                      vencido
                        ? "bg-red-50 text-red-700"
                        : porVencer
                          ? "bg-yellow-50 text-yellow-800"
                          : "bg-green-50 text-green-800"
                    }`}
                  >
                    {vencido
                      ? `Vencido hace ${Math.abs(compra.dias || 0)} días`
                      : compra.dias === 0
                        ? "Vence hoy"
                        : `Vence en ${compra.dias} días`}
                  </span>
                </div>

                {compra.certificado_url ? (
                  <a
                    href={compra.certificado_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Ver certificado
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}