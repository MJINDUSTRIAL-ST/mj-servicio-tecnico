"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Orden = {
  id: string;
  estado: string;
};

export default function ClientePortalHomePage() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        router.push("/cliente");
        return;
      }

      const email = sessionData.session.user.email;

      const { data, error } = await supabase
        .from("ordenes")
        .select("id, estado")
        .eq("cliente_email", email);

      if (!error) {
        setOrdenes(data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // 🔥 métricas dinámicas
  const totalOrdenes = ordenes.length;
  const listoEntrega = ordenes.filter(
    (o) => o.estado === "Listo" || o.estado === "Listo p/Entrega"
  ).length;

  const cotizacion = ordenes.filter(
    (o) => o.estado === "Cotización"
  ).length;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl font-bold tracking-tight">
        Bienvenido al Portal de Clientes 👋
      </h1>
      <p className="mt-3 text-lg text-slate-500">
        MJ Industrial — Servicio Técnico Industrial
      </p>

      <div className="mt-8 rounded-2xl bg-blue-50 p-6 text-blue-900">
        <h2 className="text-2xl font-bold">¿Cómo usar el portal?</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-base">
          <li>
            En <strong>Servicio Técnico</strong> puedes consultar el estado de
            tus equipos en reparación o mantención.
          </li>
          <li>
            En <strong>Mis Compras</strong> puedes revisar el historial de tus
            pedidos y compras.
          </li>
          <li>
            Haz clic en cualquier módulo para ver el detalle completo.
          </li>
        </ul>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Cargando...</p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link
            href="/cliente/portal/servicio-tecnico"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-semibold text-orange-500">
              Servicio Técnico
            </p>

            <h3 className="mt-3 text-3xl font-bold">
              {totalOrdenes}
            </h3>

            <p className="mt-2 text-slate-500">órdenes en total</p>

            <div className="mt-6 border-t border-slate-200 pt-4 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Listo p/Entrega</span>
                <span className="font-semibold">{listoEntrega}</span>
              </div>

              <div className="mt-2 flex justify-between">
                <span>Cotización</span>
                <span className="font-semibold">{cotizacion}</span>
              </div>
            </div>
          </Link>

          <Link
            href="/cliente/portal/mis-compras"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <p className="text-sm font-semibold text-blue-500">
              Mis Compras
            </p>

            <h3 className="mt-3 text-3xl font-bold">0</h3>

            <p className="mt-2 text-slate-500">compras en total</p>
          </Link>
        </div>
      )}
    </div>
  );
}